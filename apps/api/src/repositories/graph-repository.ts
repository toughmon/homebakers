import type { GraphDocument } from '@homebakers/graph-core';
import type { Pool } from 'pg';

export type GraphRecord = {
  id: string;
  name: string;
  document: GraphDocument;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type GraphSummary = Pick<GraphRecord, 'id' | 'name' | 'revision' | 'updatedAt'>;

export interface GraphRepository {
  list(): Promise<GraphSummary[]>;
  get(id: string): Promise<GraphRecord | null>;
  create(name: string, document: GraphDocument): Promise<GraphRecord>;
  update(id: string, name: string, document: GraphDocument, expectedRevision: number): Promise<GraphRecord | 'missing' | 'conflict'>;
}

type GraphRow = {
  id: string;
  name: string;
  document: GraphDocument;
  revision: number;
  created_at: Date;
  updated_at: Date;
};

function fromRow(row: GraphRow): GraphRecord {
  return {
    id: row.id,
    name: row.name,
    document: row.document,
    revision: row.revision,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class PgGraphRepository implements GraphRepository {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<GraphSummary[]> {
    const result = await this.pool.query<Pick<GraphRow, 'id' | 'name' | 'revision' | 'updated_at'>>(
      'SELECT id, name, revision, updated_at FROM graphs ORDER BY updated_at DESC',
    );
    return result.rows.map((row) => ({ id: row.id, name: row.name, revision: row.revision, updatedAt: row.updated_at.toISOString() }));
  }

  async get(id: string): Promise<GraphRecord | null> {
    const result = await this.pool.query<GraphRow>('SELECT * FROM graphs WHERE id = $1', [id]);
    return result.rows[0] ? fromRow(result.rows[0]) : null;
  }

  async create(name: string, document: GraphDocument): Promise<GraphRecord> {
    const result = await this.pool.query<GraphRow>(
      'INSERT INTO graphs (id, name, document) VALUES ($1, $2, $3::jsonb) RETURNING *',
      [crypto.randomUUID(), name, JSON.stringify(document)],
    );
    return fromRow(result.rows[0]);
  }

  async update(id: string, name: string, document: GraphDocument, expectedRevision: number): Promise<GraphRecord | 'missing' | 'conflict'> {
    const result = await this.pool.query<GraphRow>(
      `UPDATE graphs SET name = $2, document = $3::jsonb, revision = revision + 1, updated_at = now()
       WHERE id = $1 AND revision = $4 RETURNING *`,
      [id, name, JSON.stringify(document), expectedRevision],
    );
    if (result.rows[0]) return fromRow(result.rows[0]);
    return (await this.get(id)) ? 'conflict' : 'missing';
  }
}
