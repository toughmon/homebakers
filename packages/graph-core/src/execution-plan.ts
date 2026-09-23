import type { GraphDocument } from './document.js';
import { validateGraphDocument, type GraphValidationError } from './validate.js';

export type ExecutionPlan = {
  waves: string[][];
  dependencies: Record<string, string[]>;
  errors: GraphValidationError[];
};

export function planExecution(document: GraphDocument): ExecutionPlan {
  const errors = validateGraphDocument(document);
  if (errors.length) return { waves: [], dependencies: {}, errors };

  const starts = document.nodes.filter((node) => node.type === 'start');
  const ends = document.nodes.filter((node) => node.type === 'end');
  const agents = document.nodes.filter((node) => node.type === 'agent');
  if (starts.length !== 1) errors.push({ code: 'START_COUNT', message: '실행 그래프에는 시작 노드가 하나 필요합니다.' });
  if (ends.length !== 1) errors.push({ code: 'END_COUNT', message: '실행 그래프에는 종료 노드가 하나 필요합니다.' });
  if (!agents.length) errors.push({ code: 'NO_AGENTS', message: '실행할 역할 에이전트가 없습니다.' });
  for (const node of document.nodes) {
    if (node.type === 'transform') errors.push({ code: 'NON_EXECUTABLE_NODE', message: '변환 노드는 역할 하네스에서 실행할 수 없습니다.', nodeId: node.id });
  }
  if (errors.length) return { waves: [], dependencies: {}, errors };

  const outgoing = new Map(document.nodes.map((node) => [node.id, [] as string[]]));
  const incoming = new Map(document.nodes.map((node) => [node.id, [] as string[]]));
  for (const edge of document.edges) {
    outgoing.get(edge.source)!.push(edge.target);
    incoming.get(edge.target)!.push(edge.source);
  }

  const reachable = (initial: string, links: Map<string, string[]>) => {
    const seen = new Set<string>();
    const queue = [initial];
    for (const id of queue) {
      if (seen.has(id)) continue;
      seen.add(id);
      queue.push(...(links.get(id) ?? []));
    }
    return seen;
  };
  const fromStart = reachable(starts[0].id, outgoing);
  const toEnd = reachable(ends[0].id, incoming);
  for (const node of document.nodes) {
    if (!fromStart.has(node.id) || !toEnd.has(node.id)) {
      errors.push({ code: 'DISCONNECTED_NODE', message: '시작에서 종료까지 이어지지 않는 노드입니다.', nodeId: node.id });
    }
  }

  const remaining = new Map([...incoming].map(([id, parents]) => [id, parents.length]));
  let ready = document.nodes.filter((node) => remaining.get(node.id) === 0).map((node) => node.id);
  const waves: string[][] = [];
  let visited = 0;
  while (ready.length) {
    waves.push(ready);
    visited += ready.length;
    const next: string[] = [];
    for (const id of ready) {
      for (const child of outgoing.get(id) ?? []) {
        const count = remaining.get(child)! - 1;
        remaining.set(child, count);
        if (count === 0) next.push(child);
      }
    }
    ready = next;
  }
  if (visited !== document.nodes.length) errors.push({ code: 'CYCLE', message: '실행 그래프에 순환 연결이 있습니다.' });

  return {
    waves: errors.length ? [] : waves.map((wave) => wave.filter((id) => document.nodes.find((node) => node.id === id)?.type === 'agent')).filter((wave) => wave.length),
    dependencies: Object.fromEntries(agents.map((node) => [node.id, (incoming.get(node.id) ?? []).filter((id) => document.nodes.find((item) => item.id === id)?.type === 'agent')])),
    errors,
  };
}
