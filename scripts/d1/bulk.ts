import { quote, type TableSpec } from './schema';
import type { Statement } from './target';

/** Use one JSON parameter, keeping each REST call below D1's string and bind limits. */
export function bulkStatement(table: Pick<TableSpec,'name'|'columns'>, rows: Record<string, unknown>[]): Statement {
  if (!rows.length) throw new Error('EMPTY_BATCH');
  const json = JSON.stringify(rows);
  if (Buffer.byteLength(json,'utf8') > 1_800_000) throw new Error('BULK_TOO_LARGE');
  const columns = table.columns.map(c => quote(c.name)).join(',');
  const extracts = table.columns.map(c => {
    quote(c.name);
    return `json_extract(value,'$.${c.name}')`;
  }).join(',');
  return {sql:`INSERT INTO ${quote(table.name)} (${columns}) SELECT ${extracts} FROM json_each(?)`,params:[json]};
}
