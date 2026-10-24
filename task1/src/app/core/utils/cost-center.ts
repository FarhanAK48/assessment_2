import { CostCenterDetail, CostCenterOption } from '../models/performance.model';

export interface Pair {
  target: number;
  actual: number;
}

export interface CostCenterIndex {
  options: CostCenterOption[];
  /** each response row exactly once, keyed by rowKey */
  rows: Map<string, CostCenterDetail>;
  /** normalized label -> row keys that label resolves to */
  labelToRowKeys: Map<string, string[]>;
}

export const toNumber = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

export const normalizeLabel = (v: unknown): string => String(v ?? '').trim().toLowerCase();
const cleanLabel = (v: unknown): string => String(v ?? '').trim();

/** Merged rows are identified by merge_group_id, all others by position. */
export function rowKeyOf(detail: CostCenterDetail, index: number): string {
  const id = detail.merge_group_id;
  return id !== undefined && id !== null && String(id) !== '' ? `group:${id}` : `row:${index}`;
}

function pushKey(map: Map<string, string[]>, label: string, key: string): void {
  const keys = map.get(label);
  if (!keys) map.set(label, [key]);
  else if (!keys.includes(key)) keys.push(key);
}

export function buildCostCenterIndex(
  details: readonly CostCenterDetail[] | null | undefined
): CostCenterIndex {
  const rows = new Map<string, CostCenterDetail>();
  const ownKeys = new Map<string, string[]>();
  const memberKeys = new Map<string, string[]>();
  const optionByLabel = new Map<string, CostCenterOption>();

  // Pass 1: every response row, once, under its own cost_center label
  (details ?? []).forEach((detail, i) => {
    if (!detail || typeof detail !== 'object') return;
    const key = rowKeyOf(detail, i);
    if (rows.has(key)) return; // same merged row repeated: counts once
    rows.set(key, detail);

    const label = cleanLabel(detail.cost_center);
    const n = normalizeLabel(label);
    if (n) {
      pushKey(ownKeys, n, key);
      if (!optionByLabel.has(n)) optionByLabel.set(n, { label });
    }
  });

  // Pass 2: merged member names resolve to the merged row (unless they have their own row)
  rows.forEach((detail, key) => {
    const groupLabel = cleanLabel(detail.cost_center);
    const members = Array.isArray(detail.merged_group_costcenters)
      ? detail.merged_group_costcenters
      : [];
    for (const member of members) {
      const label = cleanLabel(member);
      const n = normalizeLabel(label);
      if (!n || ownKeys.has(n)) continue;
      pushKey(memberKeys, n, key);
      if (!optionByLabel.has(n)) {
        optionByLabel.set(n, groupLabel ? { label, memberOf: groupLabel } : { label });
      }
    }
  });

  const labelToRowKeys = new Map<string, string[]>(ownKeys);
  memberKeys.forEach((keys, n) => {
    if (!labelToRowKeys.has(n)) labelToRowKeys.set(n, keys);
  });

  const options = [...optionByLabel.values()].sort((a, b) => a.label.localeCompare(b.label));
  return { options, rows, labelToRowKeys };
}

/** Selected labels -> distinct response rows. A row appears once however many of its names are selected. */
export function resolveSelectedRows(
  index: CostCenterIndex,
  selected: readonly string[]
): CostCenterDetail[] {
  const keys = new Set<string>();
  for (const label of selected) {
    for (const key of index.labelToRowKeys.get(normalizeLabel(label)) ?? []) keys.add(key);
  }
  return [...index.rows.entries()].filter(([key]) => keys.has(key)).map(([, row]) => row);
}

/** Sums target/actual of one metric across rows. Percentages are never summed. */
export function aggregateTotals(rows: readonly CostCenterDetail[], source: string): Pair {
  let target = 0;
  let actual = 0;
  for (const row of rows) {
    const total = row.tables?.[source]?.total;
    target += toNumber(total?.target);
    actual += toNumber(total?.actual);
  }
  return { target, actual };
}

/** "NAME" or "NAME (merged: A, B)" for the "Showing:" line. */
export function describeRow(detail: CostCenterDetail): string {
  const label = cleanLabel(detail.cost_center) || 'Unnamed cost center';
  const members = Array.isArray(detail.merged_group_costcenters)
    ? detail.merged_group_costcenters.map(cleanLabel).filter(Boolean)
    : [];
  return members.length ? `${label} (merged: ${members.join(', ')})` : label;
}

/** Empty array = All. Removing the last selection returns to All. */
export function toggleCenter(selected: readonly string[], label: string): string[] {
  const n = normalizeLabel(label);
  return selected.some((s) => normalizeLabel(s) === n)
    ? selected.filter((s) => normalizeLabel(s) !== n)
    : [...selected, label];
}

/** Selecting All clears every individual selection. */
export function selectAll(): string[] {
  return [];
}