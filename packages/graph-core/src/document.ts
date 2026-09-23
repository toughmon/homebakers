import { Type, type Static } from '@sinclair/typebox';
import { RoleIdSchema } from './roles.js';

export const NodeKindSchema = Type.Union([
  Type.Literal('start'),
  Type.Literal('transform'),
  Type.Literal('end'),
  Type.Literal('agent'),
]);

export const AgentConfigSchema = Type.Object({
  label: Type.String({ minLength: 1, maxLength: 80 }),
  role: RoleIdSchema,
  instructions: Type.String({ maxLength: 4000 }),
}, { additionalProperties: false });

export const GraphDocumentSchema = Type.Object({
  schemaVersion: Type.Literal(1),
  nodes: Type.Array(Type.Object({
    id: Type.String({ minLength: 1 }),
    type: NodeKindSchema,
    position: Type.Object({ x: Type.Number(), y: Type.Number() }),
    config: Type.Record(Type.String(), Type.Unknown()),
  })),
  edges: Type.Array(Type.Object({
    id: Type.String({ minLength: 1 }),
    source: Type.String({ minLength: 1 }),
    sourcePort: Type.String({ minLength: 1 }),
    target: Type.String({ minLength: 1 }),
    targetPort: Type.String({ minLength: 1 }),
  })),
  viewport: Type.Object({
    x: Type.Number(),
    y: Type.Number(),
    zoom: Type.Number({ exclusiveMinimum: 0 }),
  }),
});

export type NodeKind = Static<typeof NodeKindSchema>;
export type GraphDocument = Static<typeof GraphDocumentSchema>;
export type GraphNode = GraphDocument['nodes'][number];
export type GraphEdge = GraphDocument['edges'][number];

export function emptyDocument(): GraphDocument {
  return { schemaVersion: 1, nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
}
