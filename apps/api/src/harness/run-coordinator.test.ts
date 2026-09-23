import { describe, expect, it, vi } from 'vitest';
import { createTemplateDocument, type GraphDocument, type RoleId } from '@homebakers/graph-core';
import { RunBusyError, RunCoordinator, type RoleRunInput, type RoleRunner } from './run-coordinator.js';
import type { GraphRecord } from '../repositories/graph-repository.js';
import type { RunRecord, RunRepository, RunStatus, StepStatus } from '../repositories/run-repository.js';

class MemoryRuns implements RunRepository {
  record: RunRecord | null = null;

  async create(graph: GraphRecord, task: string, roles: { nodeId: string; role: RoleId }[]): Promise<RunRecord> {
    this.record = {
      id: crypto.randomUUID(), graphId: graph.id, graphRevision: graph.revision, task,
      status: 'queued', error: null, createdAt: new Date().toISOString(), startedAt: null, finishedAt: null,
      steps: roles.map(({ nodeId, role }) => ({ nodeId, role, status: 'queued', output: null, error: null, startedAt: null, finishedAt: null })),
    };
    return this.record;
  }
  async get(): Promise<RunRecord | null> { return this.record; }
  async list() { return []; }
  async setRunStatus(_id: string, status: RunStatus, error?: string): Promise<void> {
    this.record!.status = status;
    this.record!.error = error ?? null;
  }
  async setStepStatus(_runId: string, nodeId: string, status: StepStatus, output?: string, error?: string): Promise<void> {
    const step = this.record!.steps.find((item) => item.nodeId === nodeId)!;
    step.status = status;
    step.output = output ?? step.output;
    step.error = error ?? step.error;
  }
  async interruptActive(): Promise<void> {}
}

function graph(document: GraphDocument): GraphRecord {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), name: '하네스', document, revision: 1, createdAt: now, updatedAt: now };
}

describe('run coordinator', () => {
  it('passes both upstream results to builder and completes review', async () => {
    const repository = new MemoryRuns();
    const calls: RoleRunInput[] = [];
    const runner: RoleRunner = { run: async (input) => { calls.push(input); return `${input.role} result`; } };
    await new RunCoordinator(repository, runner).start(graph(createTemplateDocument('codex-harness')), '기능 구현');
    await vi.waitFor(() => expect(repository.record?.status).toBe('succeeded'));
    expect(calls.map((call) => call.role)).toEqual(['planner', 'researcher', 'builder', 'reviewer']);
    expect(calls[2].upstream.map((item) => item.output)).toEqual(['planner result', 'researcher result']);
    expect(repository.record?.steps.every((step) => step.status === 'succeeded')).toBe(true);
  });

  it('stops after a failed role and skips downstream work', async () => {
    const repository = new MemoryRuns();
    const runner: RoleRunner = { run: async ({ role }) => {
      if (role === 'builder') throw new Error('build failed');
      return `${role} result`;
    } };
    await new RunCoordinator(repository, runner).start(graph(createTemplateDocument('codex-harness')), '기능 구현');
    await vi.waitFor(() => expect(repository.record?.status).toBe('failed'));
    expect(repository.record?.steps.find((step) => step.role === 'reviewer')?.status).toBe('skipped');
    expect(repository.record?.error).toContain('build failed');
  });

  it('prevents overlapping runs in the same workspace', async () => {
    const repository = new MemoryRuns();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const runner: RoleRunner = { run: async ({ role }) => {
      if (role === 'planner') await gate;
      return `${role} result`;
    } };
    const coordinator = new RunCoordinator(repository, runner);
    const harness = graph(createTemplateDocument('codex-harness'));
    await coordinator.start(harness, '첫 번째');
    await expect(coordinator.start(harness, '두 번째')).rejects.toBeInstanceOf(RunBusyError);
    release();
    await vi.waitFor(() => expect(repository.record?.status).toBe('succeeded'));
  });
});
