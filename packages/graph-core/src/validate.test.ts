import { describe, expect, it } from 'vitest';
import { createTemplateDocument, validateGraphDocument } from './index.js';

describe('graph validation', () => {
  it('accepts the basic template and creates independent IDs', () => {
    const first = createTemplateDocument('basic-pipeline');
    const second = createTemplateDocument('basic-pipeline');
    expect(validateGraphDocument(first)).toEqual([]);
    expect(first.nodes[0].id).not.toBe(second.nodes[0].id);
  });

  it('rejects missing nodes and invalid ports', () => {
    const document = createTemplateDocument('basic-pipeline');
    document.edges[0].target = 'missing';
    document.edges[1].sourcePort = 'wrong';
    expect(validateGraphDocument(document).map((error) => error.code)).toEqual(['MISSING_NODE', 'INVALID_PORT']);
  });

  it('rejects a second connection to one input and invalid node config', () => {
    const document = createTemplateDocument('basic-pipeline');
    document.nodes[1].config = { label: '' };
    document.edges.push({
      id: crypto.randomUUID(), source: document.nodes[0].id, sourcePort: 'out',
      target: document.nodes[1].id, targetPort: 'in',
    });
    expect(validateGraphDocument(document).map((error) => error.code)).toContain('INVALID_CONFIG');
    expect(validateGraphDocument(document).map((error) => error.code)).toContain('INPUT_OCCUPIED');
  });
});
