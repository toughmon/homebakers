import Fastify from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import { GraphDocumentSchema, createTemplateDocument, roleList, templateList, validateGraphDocument, type GraphDocument, type TemplateKey } from '@homebakers/graph-core';
import { ExecutionValidationError, RunBusyError, type RunCoordinator } from './harness/run-coordinator.js';
import type { GraphRepository } from './repositories/graph-repository.js';
import type { RunRepository } from './repositories/run-repository.js';

const IdParams = Type.Object({ id: Type.String({ pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' }) });
const CreateBody = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 120 }),
  templateKey: Type.Optional(Type.Union([Type.Literal('empty'), Type.Literal('basic-pipeline'), Type.Literal('codex-harness')])),
});
const UpdateBody = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 120 }),
  document: GraphDocumentSchema,
  expectedRevision: Type.Integer({ minimum: 1 }),
});

const StartRunBody = Type.Object({ task: Type.String({ minLength: 1, maxLength: 10000 }) });

export function createApp(repository: GraphRepository, runs?: RunRepository, coordinator?: RunCoordinator, workspace?: string) {
  const app = Fastify({ logger: true });

  app.get('/api/health', async () => ({ status: 'ok' }));
  app.get('/api/templates', async () => templateList);
  app.get('/api/roles', async () => roleList);
  app.get('/api/workspace', async () => ({ path: workspace ?? null }));
  app.get('/api/graphs', async () => repository.list());

  app.get<{ Params: Static<typeof IdParams> }>('/api/graphs/:id', { schema: { params: IdParams } }, async (request, reply) => {
    const graph = await repository.get(request.params.id);
    if (!graph) return reply.code(404).send({ message: '그래프를 찾을 수 없습니다.' });
    return graph;
  });

  app.post<{ Body: Static<typeof CreateBody> }>('/api/graphs', { schema: { body: CreateBody } }, async (request, reply) => {
    const { name, templateKey = 'empty' } = request.body;
    if (!name.trim()) return reply.code(400).send({ message: '그래프 이름을 입력해 주세요.' });
    const graph = await repository.create(name.trim(), createTemplateDocument(templateKey as TemplateKey));
    return reply.code(201).send(graph);
  });

  app.post<{ Body: GraphDocument }>('/api/graphs/validate', { schema: { body: GraphDocumentSchema } }, async (request) => {
    const errors = validateGraphDocument(request.body);
    return { valid: errors.length === 0, errors };
  });

  app.put<{ Params: Static<typeof IdParams>; Body: Static<typeof UpdateBody> }>('/api/graphs/:id', {
    schema: { params: IdParams, body: UpdateBody },
  }, async (request, reply) => {
    const errors = validateGraphDocument(request.body.document);
    if (errors.length) return reply.code(422).send({ message: '그래프 규칙을 확인해 주세요.', errors });
    if (!request.body.name.trim()) return reply.code(400).send({ message: '그래프 이름을 입력해 주세요.' });
    const result = await repository.update(
      request.params.id, request.body.name.trim(), request.body.document, request.body.expectedRevision,
    );
    if (result === 'missing') return reply.code(404).send({ message: '그래프를 찾을 수 없습니다.' });
    if (result === 'conflict') return reply.code(409).send({ message: '다른 곳에서 수정된 그래프입니다. 다시 불러온 뒤 변경 사항을 확인해 주세요.' });
    return result;
  });

  app.get<{ Params: Static<typeof IdParams> }>('/api/graphs/:id/runs', { schema: { params: IdParams } }, async (request, reply) => {
    if (!runs) return reply.code(503).send({ message: '실행 저장소가 구성되지 않았습니다.' });
    return runs.list(request.params.id);
  });

  app.get<{ Params: Static<typeof IdParams> }>('/api/runs/:id', { schema: { params: IdParams } }, async (request, reply) => {
    if (!runs) return reply.code(503).send({ message: '실행 저장소가 구성되지 않았습니다.' });
    const run = await runs.get(request.params.id);
    if (!run) return reply.code(404).send({ message: '실행 기록을 찾을 수 없습니다.' });
    return run;
  });

  app.post<{ Params: Static<typeof IdParams>; Body: Static<typeof StartRunBody> }>('/api/graphs/:id/runs', {
    schema: { params: IdParams, body: StartRunBody },
  }, async (request, reply) => {
    if (!coordinator) return reply.code(503).send({ message: 'Codex 실행기가 구성되지 않았습니다.' });
    if (!request.body.task.trim()) return reply.code(400).send({ message: '실행 작업을 입력해 주세요.' });
    const graph = await repository.get(request.params.id);
    if (!graph) return reply.code(404).send({ message: '그래프를 찾을 수 없습니다.' });
    try {
      const run = await coordinator.start(graph, request.body.task.trim());
      return reply.code(202).send(run);
    } catch (error) {
      if (error instanceof ExecutionValidationError) {
        return reply.code(422).send({ message: error.message, errors: error.errors });
      }
      if (error instanceof RunBusyError) return reply.code(409).send({ message: error.message });
      throw error;
    }
  });

  return app;
}
