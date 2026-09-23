import { emptyDocument, type GraphDocument } from './document.js';

export const templateList = [
  { key: 'codex-harness', name: 'Codex 역할 하네스', description: '계획·조사 → 구현 → 검토 역할 그래프입니다.' },
  { key: 'empty', name: '빈 그래프', description: '빈 캔버스에서 시작합니다.' },
  { key: 'basic-pipeline', name: '기본 파이프라인', description: '시작 → 변환 → 종료 노드가 준비됩니다.' },
] as const;

export type TemplateKey = typeof templateList[number]['key'];

export function createTemplateDocument(key: TemplateKey): GraphDocument {
  if (key === 'empty') return emptyDocument();
  if (key === 'codex-harness') {
    const [start, planner, researcher, builder, reviewer, end] = Array.from({ length: 6 }, () => crypto.randomUUID());
    const edge = (source: string, target: string) => ({
      id: crypto.randomUUID(), source, sourcePort: 'out', target, targetPort: 'in',
    });
    return {
      schemaVersion: 1,
      nodes: [
        { id: start, type: 'start', position: { x: 60, y: 250 }, config: { label: '요청' } },
        { id: planner, type: 'agent', position: { x: 340, y: 90 }, config: { label: '계획', role: 'planner', instructions: '' } },
        { id: researcher, type: 'agent', position: { x: 340, y: 410 }, config: { label: '조사', role: 'researcher', instructions: '' } },
        { id: builder, type: 'agent', position: { x: 650, y: 250 }, config: { label: '구현', role: 'builder', instructions: '' } },
        { id: reviewer, type: 'agent', position: { x: 950, y: 250 }, config: { label: '검토', role: 'reviewer', instructions: '' } },
        { id: end, type: 'end', position: { x: 1250, y: 250 }, config: { label: '결과' } },
      ],
      edges: [edge(start, planner), edge(start, researcher), edge(planner, builder), edge(researcher, builder), edge(builder, reviewer), edge(reviewer, end)],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
  }
  const [start, transform, end] = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  return {
    schemaVersion: 1,
    nodes: [
      { id: start, type: 'start', position: { x: 80, y: 160 }, config: { label: '시작' } },
      { id: transform, type: 'transform', position: { x: 360, y: 160 }, config: { label: '변환', expression: '' } },
      { id: end, type: 'end', position: { x: 640, y: 160 }, config: { label: '종료' } },
    ],
    edges: [
      { id: crypto.randomUUID(), source: start, sourcePort: 'out', target: transform, targetPort: 'in' },
      { id: crypto.randomUUID(), source: transform, sourcePort: 'out', target: end, targetPort: 'in' },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}
