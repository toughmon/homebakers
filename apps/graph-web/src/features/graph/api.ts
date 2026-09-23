import type { GraphDocument, GraphValidationError, TemplateKey } from '@homebakers/graph-core';

export type GraphRecord = {
  id: string;
  name: string;
  document: GraphDocument;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type GraphSummary = Pick<GraphRecord, 'id' | 'name' | 'revision' | 'updatedAt'>;
export type TemplateSummary = { key: TemplateKey; name: string; description: string };
export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'interrupted';
export type RunSummary = {
  id: string;
  graphId: string;
  graphRevision: number;
  task: string;
  status: RunStatus;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};
export type RunRecord = RunSummary & {
  steps: {
    nodeId: string;
    role: string;
    status: RunStatus | 'skipped';
    output: string | null;
    error: string | null;
    startedAt: string | null;
    finishedAt: string | null;
  }[];
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors: GraphValidationError[] = []) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const payload = await response.json();
  if (!response.ok) throw new ApiError(response.status, payload.message ?? '요청에 실패했습니다.', payload.errors ?? []);
  return payload as T;
}

export const graphApi = {
  list: () => request<GraphSummary[]>('/graphs'),
  templates: () => request<TemplateSummary[]>('/templates'),
  get: (id: string) => request<GraphRecord>(`/graphs/${id}`),
  create: (name: string, templateKey: TemplateKey) => request<GraphRecord>('/graphs', {
    method: 'POST', body: JSON.stringify({ name, templateKey }),
  }),
  save: (id: string, name: string, document: GraphDocument, expectedRevision: number) => request<GraphRecord>(`/graphs/${id}`, {
    method: 'PUT', body: JSON.stringify({ name, document, expectedRevision }),
  }),
  validate: (document: GraphDocument) => request<{ valid: boolean; errors: GraphValidationError[] }>('/graphs/validate', {
    method: 'POST', body: JSON.stringify(document),
  }),
  listRuns: (graphId: string) => request<RunSummary[]>(`/graphs/${graphId}/runs`),
  getRun: (runId: string) => request<RunRecord>(`/runs/${runId}`),
  startRun: (graphId: string, task: string) => request<RunRecord>(`/graphs/${graphId}/runs`, {
    method: 'POST', body: JSON.stringify({ task }),
  }),
};
