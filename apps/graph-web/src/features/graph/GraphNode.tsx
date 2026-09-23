import { Handle, Position, type NodeProps } from '@xyflow/react';
import { nodeRegistry, roleCatalog, type RoleId } from '@homebakers/graph-core';
import type { EditorNode } from './flow';

export function GraphNode({ data, selected }: NodeProps<EditorNode>) {
  const definition = nodeRegistry[data.kind];
  const role = data.kind === 'agent' ? roleCatalog[data.config.role as RoleId] : null;
  return (
    <div className={`graph-node ${selected ? 'graph-node--selected' : ''}`} style={{ '--node-color': definition.color } as React.CSSProperties}>
      {definition.inputs.map((port) => <Handle key={port} id={port} type="target" position={Position.Left} />)}
      <div className="graph-node__eyebrow">{role ? role.label : definition.label}</div>
      <div className="graph-node__title">{data.config.label || definition.label}</div>
      <div className="graph-node__description">{role ? role.purpose : definition.description}</div>
      {role && <div className="graph-node__role">{role.sandbox === 'read-only' ? 'READ ONLY' : 'WORKSPACE WRITE'}</div>}
      {definition.outputs.map((port) => <Handle key={port} id={port} type="source" position={Position.Right} />)}
    </div>
  );
}
