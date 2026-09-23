import { planExecution, roleCatalog, type GraphDocument, type RoleId } from '@homebakers/graph-core';
import type { GraphRecord } from '../repositories/graph-repository.js';
import type { RunRecord, RunRepository } from '../repositories/run-repository.js';

export type RoleRunInput = {
  role: RoleId;
  task: string;
  instructions: string;
  upstream: { nodeId: string; output: string }[];
};

export interface RoleRunner {
  run(input: RoleRunInput): Promise<string>;
}

export class ExecutionValidationError extends Error {
  constructor(public readonly errors: ReturnType<typeof planExecution>['errors']) {
    super('실행 그래프 규칙을 확인해 주세요.');
  }
}

export class RunBusyError extends Error {
  constructor() { super('이미 다른 역할 그래프가 실행 중입니다. 완료된 뒤 다시 시도해 주세요.'); }
}

export class RunCoordinator {
  private active = false;
  constructor(private readonly repository: RunRepository, private readonly runner: RoleRunner) {}

  async start(graph: GraphRecord, task: string): Promise<RunRecord> {
    if (this.active) throw new RunBusyError();
    const plan = planExecution(graph.document);
    if (plan.errors.length) throw new ExecutionValidationError(plan.errors);
    const nodes = new Map(graph.document.nodes.map((node) => [node.id, node]));
    const roles = plan.waves.flat().map((nodeId) => ({
      nodeId, role: nodes.get(nodeId)!.config.role as RoleId,
    }));
    this.active = true;
    let run: RunRecord;
    try {
      run = await this.repository.create(graph, task, roles);
    } catch (error) {
      this.active = false;
      throw error;
    }
    void this.execute(run.id, graph.document, task, plan.waves, plan.dependencies).catch(async (error) => {
      try {
        await this.repository.setRunStatus(run.id, 'failed', error instanceof Error ? error.message : String(error));
      } catch (storageError) {
        console.error('Failed to record graph run failure', storageError);
      }
    }).finally(() => { this.active = false; });
    return run;
  }

  private async execute(runId: string, document: GraphDocument, task: string, waves: string[][], dependencies: Record<string, string[]>): Promise<void> {
    const nodes = new Map(document.nodes.map((node) => [node.id, node]));
    const outputs = new Map<string, string>();
    await this.repository.setRunStatus(runId, 'running');

    for (let index = 0; index < waves.length; index++) {
      const results = await Promise.all(waves[index].map(async (nodeId) => {
        const node = nodes.get(nodeId)!;
        const role = node.config.role as RoleId;
        await this.repository.setStepStatus(runId, nodeId, 'running');
        try {
          const output = await this.runner.run({
            role, task,
            instructions: String(node.config.instructions ?? ''),
            upstream: dependencies[nodeId].map((id) => ({ nodeId: id, output: outputs.get(id)! })),
          });
          outputs.set(nodeId, output);
          await this.repository.setStepStatus(runId, nodeId, 'succeeded', output);
          return null;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await this.repository.setStepStatus(runId, nodeId, 'failed', undefined, message);
          return `${roleCatalog[role].label}: ${message}`;
        }
      }));
      const failure = results.find((result) => result !== null);
      if (failure) {
        for (const later of waves.slice(index + 1).flat()) {
          await this.repository.setStepStatus(runId, later, 'skipped');
        }
        await this.repository.setRunStatus(runId, 'failed', failure);
        return;
      }
    }
    await this.repository.setRunStatus(runId, 'succeeded');
  }
}
