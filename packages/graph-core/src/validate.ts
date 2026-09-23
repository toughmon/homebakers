import { Value } from '@sinclair/typebox/value';
import { GraphDocumentSchema, type GraphDocument } from './document.js';
import { nodeRegistry } from './node-registry.js';

export type GraphValidationError = {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
};

export function validateGraphDocument(value: unknown): GraphValidationError[] {
  if (!Value.Check(GraphDocumentSchema, value)) {
    return [{ code: 'INVALID_DOCUMENT', message: '그래프 문서 형식이 올바르지 않습니다.' }];
  }

  const document = value as GraphDocument;
  const errors: GraphValidationError[] = [];
  const nodes = new Map<string, GraphDocument['nodes'][number]>();
  const edges = new Set<string>();
  const occupiedInputs = new Set<string>();

  for (const node of document.nodes) {
    if (nodes.has(node.id)) errors.push({ code: 'DUPLICATE_NODE', message: '노드 ID가 중복되었습니다.', nodeId: node.id });
    nodes.set(node.id, node);
    if (!Value.Check(nodeRegistry[node.type].configSchema, node.config)) {
      errors.push({ code: 'INVALID_CONFIG', message: '노드 설정을 확인해 주세요.', nodeId: node.id });
    }
  }

  for (const edge of document.edges) {
    if (edges.has(edge.id)) errors.push({ code: 'DUPLICATE_EDGE', message: '연결 ID가 중복되었습니다.', edgeId: edge.id });
    edges.add(edge.id);
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source || !target) {
      errors.push({ code: 'MISSING_NODE', message: '연결 대상 노드가 없습니다.', edgeId: edge.id });
      continue;
    }
    if (!nodeRegistry[source.type].outputs.includes(edge.sourcePort) ||
        !nodeRegistry[target.type].inputs.includes(edge.targetPort)) {
      errors.push({ code: 'INVALID_PORT', message: '연결 포트가 올바르지 않습니다.', edgeId: edge.id });
    }
    const inputKey = `${edge.target}:${edge.targetPort}`;
    if (occupiedInputs.has(inputKey) && !nodeRegistry[target.type].allowMultipleInputs) {
      errors.push({ code: 'INPUT_OCCUPIED', message: '입력 포트에는 한 연결만 허용됩니다.', edgeId: edge.id });
    }
    occupiedInputs.add(inputKey);
  }

  return errors;
}
