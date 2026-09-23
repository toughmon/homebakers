import type { RoleId } from '@homebakers/graph-core';
import type { Pool } from 'pg';
import type { GraphRecord } from './graph-repository.js';

export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'interrupted';
export type StepStatus = RunStatus | 'skipped';

export type RunStep = {
  nodeId: string;
  role: RoleId;
  status: StepStatus;
  output: string | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
};

export type RunRecord = {
  id: string;
  graphId: string;
  graphRevision: number;
  task: string;
  status: RunStatus;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  steps: RunStep[];
};

export type RunSummary = Omit<RunRecord, 'steps'>;

export interface RunRepository {
  create(graph: GraphRecord, task: string, roles: { nodeId: string; role: RoleId }[]): Promise<RunRecord>;
  get(id: string): Promise<RunRecord | null>;
  list(graphId: string): Promise<RunSummary[]>;
  setRunStatus(id: string, status: RunStatus, error?: string): Promise<void>;
  setStepStatus(runId: string, nodeId: string, status: StepStatus, output?: string, error?: string): Promise<void>;
  interruptActive(): Promise<void>;
}

type RunRow = {
  id: string; graph_id: string; graph_revision: number; task: string; status: RunStatus;
  error: string | null; created_at: Date; started_at: Date | null; finished_at: Date | null;
};
type StepRow = {
  node_id: string; role: RoleId; status: StepStatus; output: string | null; error: string | null;
  started_at: Date | null; finished_at: Date | null;
};

function runFromRow(row: RunRow): RunSummary {
  return {
    id: row.id, graphId: row.graph_id, graphRevision: row.graph_revision,
    task: row.task, status: row.status, error: row.error,
    createdAt: row.created_at.toISOString(),
    startedAt: row.started_at?.toISOString() ?? null,
    finishedAt: row.finished_at?.toISOString() ?? null,
  };
}

export class PgRunRepository implements RunRepository {
  constructor(private readonly pool: Pool) {}

  async create(graph: GraphRecord, task: string, roles: { nodeId: string; role: RoleId }[]): Promise<RunRecord> {
    const client = await this.pool.connect();
    const id = crypto.randomUUID();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO graph_runs (id, graph_id, graph_revision, document, task, status)
         VALUES ($1, $2, $3, $4::jsonb, $5, 'queued')`,
        [id, graph.id, graph.revision, JSON.stringify(graph.document), task],
      );
      for (const [sequence, role] of roles.entries()) {
        await client.query(
          `INSERT INTO graph_run_steps (run_id, node_id, sequence, role, status) VALUES ($1, $2, $3, $4, 'queued')`,
          [id, role.nodeId, sequence, role.role],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return (await this.get(id))!;
  }

  async get(id: string): Promise<RunRecord | null> {
    const result = await this.pool.query<RunRow>('SELECT * FROM graph_runs WHERE id = $1', [id]);
    if (!result.rows[0]) return null;
    const steps = await this.pool.query<StepRow>(
      'SELECT node_id, role, status, output, error, started_at, finished_at FROM graph_run_steps WHERE run_id = $1 ORDER BY sequence', [id],
    );
    return {
      ...runFromRow(result.rows[0]),
      steps: steps.rows.map((row) => ({
        nodeId: row.node_id, role: row.role, status: row.status,
        output: row.output, error: row.error,
        startedAt: row.started_at?.toISOString() ?? null,
        finishedAt: row.finished_at?.toISOString() ?? null,
      })),
    };
  }

  async list(graphId: string): Promise<RunSummary[]> {
    const result = await this.pool.query<RunRow>('SELECT * FROM graph_runs WHERE graph_id = $1 ORDER BY created_at DESC LIMIT 30', [graphId]);
    return result.rows.map(runFromRow);
  }

  async setRunStatus(id: string, status: RunStatus, error?: string): Promise<void> {
    await this.pool.query(
      `UPDATE graph_runs SET status = $2, error = COALESCE($3, error),
       started_at = CASE WHEN $2 = 'running' THEN now() ELSE started_at END,
       finished_at = CASE WHEN $2 IN ('succeeded', 'failed', 'interrupted') THEN now() ELSE finished_at END
       WHERE id = $1`, [id, status, error ?? null],
    );
  }

  async setStepStatus(runId: string, nodeId: string, status: StepStatus, output?: string, error?: string): Promise<void> {
    await this.pool.query(
      `UPDATE graph_run_steps SET status = $3, output = COALESCE($4, output), error = COALESCE($5, error),
       started_at = CASE WHEN $3 = 'running' THEN now() ELSE started_at END,
       finished_at = CASE WHEN $3 IN ('succeeded', 'failed', 'skipped', 'interrupted') THEN now() ELSE finished_at END
       WHERE run_id = $1 AND node_id = $2`, [runId, nodeId, status, output ?? null, error ?? null],
    );
  }

  async interruptActive(): Promise<void> {
    await this.pool.query(
      `UPDATE graph_runs SET status = 'interrupted', error = 'API 서버 재시작으로 실행이 중단되었습니다.', finished_at = now()
       WHERE status IN ('queued', 'running')`,
    );
    await this.pool.query(
      `UPDATE graph_run_steps SET status = 'interrupted', finished_at = now()
       WHERE status IN ('queued', 'running') AND run_id IN (SELECT id FROM graph_runs WHERE status = 'interrupted')`,
    );
  }
}
