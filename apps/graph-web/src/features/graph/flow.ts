import type { GraphDocument, NodeKind } from '@homebakers/graph-core';
import type { Edge, Node } from '@xyflow/react';

export type EditorNode = Node<{ kind: NodeKind; config: Record<string, string> }, 'graph'>;
export type EditorEdge = Edge;

export function toFlow(document: GraphDocument): { nodes: EditorNode[]; edges: EditorEdge[] } {
  return {
    nodes: document.nodes.map((node) => ({
      id: node.id,
      type: 'graph',
      position: node.position,
      data: { kind: node.type, config: node.config as Record<string, string> },
    })),
    edges: document.edges.map((edge) => ({
      id: edge.id, source: edge.source, target: edge.target,
      sourceHandle: edge.sourcePort, targetHandle: edge.targetPort,
      type: 'smoothstep', animated: false,
    })),
  };
}

export function toDocument(nodes: EditorNode[], edges: EditorEdge[], viewport: GraphDocument['viewport']): GraphDocument {
  return {
    schemaVersion: 1,
    nodes: nodes.map((node) => ({
      id: node.id, type: node.data.kind, position: node.position, config: node.data.config,
    })),
    edges: edges.map((edge) => ({
      id: edge.id, source: edge.source, target: edge.target,
      sourcePort: edge.sourceHandle ?? 'out', targetPort: edge.targetHandle ?? 'in',
    })),
    viewport,
  };
}
