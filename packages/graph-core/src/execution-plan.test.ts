import { describe, expect, it } from 'vitest';
import { createTemplateDocument, planExecution } from './index.js';

describe('Codex harness execution plan', () => {
  it('runs independent roles together and joins before builder', () => {
    const document = createTemplateDocument('codex-harness');
    const plan = planExecution(document);
    const roleByNode = new Map(document.nodes.map((node) => [node.id, node.config.role]));
    expect(plan.errors).toEqual([]);
    expect(plan.waves.map((wave) => wave.map((id) => roleByNode.get(id)))).toEqual([
      ['planner', 'researcher'], ['builder'], ['reviewer'],
    ]);
    expect(plan.dependencies[document.nodes[3].id]).toEqual([document.nodes[1].id, document.nodes[2].id]);
  });

  it('rejects a cycle before creating a run', () => {
    const document = createTemplateDocument('codex-harness');
    document.edges.push({
      id: crypto.randomUUID(), source: document.nodes[4].id, sourcePort: 'out',
      target: document.nodes[3].id, targetPort: 'in',
    });
    expect(planExecution(document).errors.map((error) => error.code)).toContain('CYCLE');
  });

  it('rejects a disconnected role', () => {
    const document = createTemplateDocument('codex-harness');
    document.edges = document.edges.filter((edge) => edge.target !== document.nodes[2].id);
    expect(planExecution(document).errors.map((error) => error.code)).toContain('DISCONNECTED_NODE');
  });
});
