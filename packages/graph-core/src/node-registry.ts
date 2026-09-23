import { Type, type TSchema } from '@sinclair/typebox';
import { AgentConfigSchema } from './document.js';
import type { NodeKind } from './document.js';
import { roleList } from './roles.js';

export type NodeDefinition = {
  kind: NodeKind;
  label: string;
  description: string;
  color: string;
  inputs: readonly string[];
  outputs: readonly string[];
  defaultConfig: Record<string, string>;
  fields: readonly { key: string; label: string; multiline?: boolean; options?: readonly { value: string; label: string }[] }[];
  allowMultipleInputs?: boolean;
  configSchema: TSchema;
};

const label = Type.String({ minLength: 1, maxLength: 80 });

export const nodeRegistry: Record<NodeKind, NodeDefinition> = {
  start: {
    kind: 'start', label: '시작', description: '그래프의 시작점', color: '#42b9a1',
    inputs: [], outputs: ['out'], defaultConfig: { label: '시작' },
    fields: [{ key: 'label', label: '이름' }],
    configSchema: Type.Object({ label }, { additionalProperties: false }),
  },
  transform: {
    kind: 'transform', label: '변환', description: '입력을 처리하는 단계', color: '#8b79e8',
    inputs: ['in'], outputs: ['out'], defaultConfig: { label: '변환', expression: '' },
    fields: [{ key: 'label', label: '이름' }, { key: 'expression', label: '처리 메모', multiline: true }],
    configSchema: Type.Object({ label, expression: Type.String({ maxLength: 2000 }) }, { additionalProperties: false }),
  },
  end: {
    kind: 'end', label: '종료', description: '그래프의 종료점', color: '#ee9c61',
    inputs: ['in'], outputs: [], defaultConfig: { label: '종료' },
    fields: [{ key: 'label', label: '이름' }],
    configSchema: Type.Object({ label }, { additionalProperties: false }),
    allowMultipleInputs: true,
  },
  agent: {
    kind: 'agent', label: '역할 에이전트', description: 'Codex 역할을 실행하는 단계', color: '#4c83d9',
    inputs: ['in'], outputs: ['out'],
    defaultConfig: { label: 'Planner', role: 'planner', instructions: '' },
    fields: [
      { key: 'label', label: '노드 이름' },
      { key: 'role', label: '역할', options: roleList.map((role) => ({ value: role.id, label: role.label })) },
      { key: 'instructions', label: '추가 지시사항', multiline: true },
    ],
    configSchema: AgentConfigSchema,
    allowMultipleInputs: true,
  },
};

export const nodeDefinitions = Object.values(nodeRegistry);
