import { is, SQL, getTableName } from 'drizzle-orm';
import { PgTable, PgDialect, getTableConfig } from 'drizzle-orm/pg-core';
import * as applicationSchema from '../../shared/schema';

export type ColumnSpec = { name: string; kind: 'text' | 'integer' | 'real' | 'boolean' | 'timestamp' | 'json' | 'array'; nullable: boolean };
export type TableSpec = { name: string; columns: ColumnSpec[]; ddl: string; indexes: string[] };
export function quote(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error('UNSAFE_SCHEMA_IDENTIFIER');
  return `"${name}"`;
}
const dialect = new PgDialect();

function expression(value: SQL): string {
  const compiled = dialect.sqlToQuery(value);
  if (compiled.params.length) throw new Error('PARAMETERIZED_SCHEMA_EXPRESSION');
  // The schema uses only now() and simple partial-index predicates.
  const result = compiled.sql.replace(/\bnow\(\)/gi, "strftime('%Y-%m-%dT%H:%M:%fZ','now')")
    .replace(/"[a-z_][a-z0-9_]*"\.("[a-z_][a-z0-9_]*")/g, '$1');
  if (/::|\b(interval|nextval|ARRAY)\b/i.test(result)) throw new Error('UNSUPPORTED_SCHEMA_EXPRESSION');
  return result;
}

function kind(sqlType: string): ColumnSpec['kind'] {
  if (sqlType.endsWith('[]')) return 'array';
  if (/^timestamp/.test(sqlType)) return 'timestamp';
  if (sqlType === 'boolean') return 'boolean';
  if (/^jsonb?$/.test(sqlType)) return 'json';
  if (['integer', 'serial', 'smallint'].includes(sqlType)) return 'integer';
  if (['real', 'double precision'].includes(sqlType)) return 'real';
  if (sqlType === 'text') return 'text';
  throw new Error(`UNSUPPORTED_COLUMN_TYPE:${sqlType}`);
}

function defaultSql(value: unknown): string {
  if (is(value, SQL)) return `(${expression(value)})`;
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return `'${value.replaceAll("'", "''")}'`;
  if (value === null) return 'NULL';
  throw new Error('UNSUPPORTED_COLUMN_DEFAULT');
}

export function buildApplicationSchema(): TableSpec[] {
  return Object.values(applicationSchema).filter((value) => is(value, PgTable)).map((table) => {
    const config = getTableConfig(table);
    if (config.schema || config.policies.length || config.enableRLS || config.checks.length) {
      throw new Error('SCHEMA_REQUIRES_EXPLICIT_CONVERSION');
    }
    const columns = config.columns.map((column): ColumnSpec => ({
      name: column.name, kind: kind(column.getSQLType()), nullable: !column.notNull,
    }));
    if (columns.length > 100) throw new Error('D1_COLUMN_LIMIT');
    const definitions = config.columns.map((column, index) => {
      const k = columns[index].kind;
      const type = ['integer', 'boolean'].includes(k) ? 'INTEGER' : k === 'real' ? 'REAL' : 'TEXT';
      let definition = `${quote(column.name)} ${type}`;
      if (column.primary) definition += ' PRIMARY KEY' + (column.getSQLType() === 'serial' ? ' AUTOINCREMENT' : '');
      if (column.notNull) definition += ' NOT NULL';
      if (column.isUnique) definition += ' UNIQUE';
      if (column.default !== undefined) definition += ` DEFAULT ${defaultSql(column.default)}`;
      if (k === 'boolean') definition += ` CHECK (${quote(column.name)} IN (0,1))`;
      if (k === 'json' || k === 'array') definition += ` CHECK (${quote(column.name)} IS NULL OR json_valid(${quote(column.name)}))`;
      return definition;
    });
    for (const fk of config.foreignKeys) {
      const ref = fk.reference();
      definitions.push(`FOREIGN KEY (${ref.columns.map(c => quote(c.name)).join(',')}) REFERENCES ${quote(getTableName(ref.foreignTable))} (${ref.foreignColumns.map(c => quote(c.name)).join(',')}) ON DELETE ${fk.onDelete || 'NO ACTION'} ON UPDATE ${fk.onUpdate || 'NO ACTION'}`);
    }
    for (const key of config.primaryKeys) definitions.push(`PRIMARY KEY (${key.columns.map(c => quote(c.name)).join(',')})`);
    for (const key of config.uniqueConstraints) definitions.push(`UNIQUE (${key.columns.map(c => quote(c.name)).join(',')})`);
    const indexes = config.indexes.map(({ config: index }) => {
      if (!index.name || (index.method && index.method !== 'btree')) throw new Error('UNSUPPORTED_INDEX');
      const cols = index.columns.map(c => {
        if (is(c, SQL) || !('name' in c) || typeof c.name !== 'string') throw new Error('EXPRESSION_INDEX_REQUIRES_REVIEW');
        return quote(c.name);
      });
      return `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${quote(index.name)} ON ${quote(config.name)} (${cols.join(',')})${index.where ? ` WHERE ${expression(index.where)}` : ''};`;
    });
    return { name: config.name, columns, ddl: `CREATE TABLE ${quote(config.name)} (\n  ${definitions.join(',\n  ')}\n);`, indexes };
  });
}

export function encodeValue(column: ColumnSpec, value: unknown): string | number | null {
  if (value === null || value === undefined) {
    if (!column.nullable) throw new Error(`REQUIRED_COLUMN_MISSING:${column.name}`);
    return null;
  }
  if (column.kind === 'boolean') {
    if (value !== true && value !== false) throw new Error('INVALID_BOOLEAN');
    return value ? 1 : 0;
  }
  if (column.kind === 'timestamp') {
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new Error('INVALID_TIMESTAMP');
    return value.toISOString();
  }
  if (column.kind === 'json' || column.kind === 'array') {
    if (column.kind === 'array' && !Array.isArray(value)) throw new Error('INVALID_ARRAY');
    return JSON.stringify(value);
  }
  if (column.kind === 'integer') {
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw new Error('UNSAFE_INTEGER');
    return value;
  }
  if (column.kind === 'real') {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('INVALID_REAL');
    return value;
  }
  if (typeof value !== 'string') throw new Error('INVALID_TEXT');
  return value;
}

export function encodeRow(table: TableSpec, row: Record<string, unknown>): Record<string, string | number | null> {
  return Object.fromEntries(table.columns.map(column => [column.name, encodeValue(column, row[column.name])]));
}

export function insertStatement(table: TableSpec, rows: Record<string, string | number | null>[]) {
  if (!rows.length || rows.length * table.columns.length > 100) throw new Error('D1_BIND_LIMIT');
  return {
    sql: `INSERT INTO ${quote(table.name)} (${table.columns.map(c => quote(c.name)).join(',')}) VALUES ${rows.map(() => `(${table.columns.map(() => '?').join(',')})`).join(',')}`,
    params: rows.flatMap(row => table.columns.map(column => row[column.name])),
  };
}
