import { afterEach, describe, expect, it } from 'vitest';
import { createTemplateDocument, type GraphDocument } from '@homebakers/graph-core';
import { createApp } from './app.js';
import { RunCoordinator } from './harness/run-coordinator.js';
import type { GraphRecord, GraphRepository, GraphSummary } from './repositories/graph-repository.js';
import type { RunRepository } from './repositories/run-repository.js';

class MemoryRepository implements GraphRepository {
  private records = new Map<string, GraphRecord>();

  async list(): Promise<GraphSummary[]> {
    return [...this.records.values()].map(({ id, name, revision, updatedAt }) => ({ id, name, revision, updatedAt }));
  }

  async get(id: string): Promise<GraphRecord | null> {
    return this.records.get(id) ?? null;
  }

  async create(name: string, document: GraphDocument): Promise<GraphRecord> {
    const now = new Date().toISOString();
    const record = { id: crypto.randomUUID(), name, document, revision: 1, createdAt: now, updatedAt: now };
    this.records.set(record.id, record);
    return record;
  }

  async update(id: string, name: string, document: GraphDocument, expectedRevision: number): Promise<GraphRecord | 'missing' | 'conflict'> {
    const current = this.records.get(id);
    if (!current) return 'missing';
    if (current.revision !== expectedRevision) return 'conflict';
    const updated = { ...current, name, document, revision: current.revision + 1, updatedAt: new Date().toISOString() };
    this.records.set(id, updated);
    return updated;
  }
}

const apps: ReturnType<typeof createApp>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

describe('graph API', () => {
  it('creates, saves, and detects an outdated revision', async () => {
    const app = createApp(new MemoryRepository());
    apps.push(app);
    const created = await app.inject({ method: 'POST', url: '/api/graphs', payload: { name: '테스트', templateKey: 'basic-pipeline' } });
    expect(created.statusCode).toBe(201);
    const graph = created.json<GraphRecord>();
    expect(graph.document.nodes).toHaveLength(3);

    const save = await app.inject({ method: 'PUT', url: `/api/graphs/${graph.id}`, payload: {
      name: '수정됨', document: graph.document, expectedRevision: 1,
    } });
    expect(save.statusCode).toBe(200);
    expect(save.json<GraphRecord>().revision).toBe(2);

    const stale = await app.inject({ method: 'PUT', url: `/api/graphs/${graph.id}`, payload: {
      name: '오래된 저장', document: graph.document, expectedRevision: 1,
    } });
    expect(stale.statusCode).toBe(409);
  });

  it('returns graph-rule errors separately from request-shape errors', async () => {
    const app = createApp(new MemoryRepository());
    apps.push(app);
    const graph = createTemplateDocument('basic-pipeline');
    graph.edges[0].target = 'missing';
    const invalidGraph = await app.inject({ method: 'POST', url: '/api/graphs/validate', payload: graph });
    expect(invalidGraph.statusCode).toBe(200);
    expect(invalidGraph.json().errors[0].code).toBe('MISSING_NODE');

    const invalidBody = await app.inject({ method: 'POST', url: '/api/graphs/validate', payload: { nodes: [] } });
    expect(invalidBody.statusCode).toBe(400);
  });

  it('exposes roles and rejects execution of a non-harness graph', async () => {
    const graphs = new MemoryRepository();
    const graph = await graphs.create('빈 그래프', createTemplateDocument('empty'));
    const coordinator = new RunCoordinator({} as RunRepository, { run: async () => 'unused' });
    const app = createApp(graphs, undefined, coordinator);
    apps.push(app);

    const roles = await app.inject({ method: 'GET', url: '/api/roles' });
    expect(roles.json()).toHaveLength(4);

    const run = await app.inject({ method: 'POST', url: `/api/graphs/${graph.id}/runs`, payload: { task: '기능 구현' } });
    expect(run.statusCode).toBe(422);
    expect(run.json().errors.map((error: { code: string }) => error.code)).toContain('NO_AGENTS');
  });
});
