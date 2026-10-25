import {
  CostCenterDetail,
  CostCenterOption,
  ENGAGEMENT_TYPES,
  EngagementType,
} from '../models/performance.model';

export interface Pair {
  target: number;
  actual: number;
}

export interface CostCenterIndex {
  options: CostCenterOption[];
  rows: Map<string, CostCenterDetail>;
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


/** Keeps only valid types, de-duplicated, always in Own / Rented / Hired order. */
export function normalizeEngagements(
  selected: readonly string[] | null | undefined
): EngagementType[] {
  const wanted = new Set<string>(selected ?? []);
  return ENGAGEMENT_TYPES.filter((type) => wanted.has(type));
}

/** Independent toggle: any combination of the three is allowed. Empty = combined. */
export function toggleEngagement(
  selected: readonly string[],
  type: EngagementType
): EngagementType[] {
  const next = new Set<string>(normalizeEngagements(selected));
  if (next.has(type)) next.delete(type);
  else next.add(type);
  return normalizeEngagements([...next]);
}

/** true if at least one row has a table for at least one selected type */
export function hasEngagementData(
  rows: readonly CostCenterDetail[],
  engagements: readonly EngagementType[]
): boolean {
  return rows.some((row) =>
    engagements.some((type) => {
      const table = row.engagement_tables?.[type];
      return !!table && typeof table === 'object';
    })
  );
}


export function aggregateTotals(
  rows: readonly CostCenterDetail[],
  source: string,
  engagements: readonly EngagementType[] = []
): Pair {
  const types = normalizeEngagements(engagements);
  let target = 0;
  let actual = 0;

  for (const row of rows) {
    if (types.length === 0) {
      const total = row.tables?.[source]?.total;
      target += toNumber(total?.target);
      actual += toNumber(total?.actual);
    } else {
      for (const type of types) {
        const total = row.engagement_tables?.[type]?.[source]?.total;
        target += toNumber(total?.target);
        actual += toNumber(total?.actual);
      }
    }
  }
  return { target, actual };
}

export function describeRow(detail: CostCenterDetail): string {
  const label = cleanLabel(detail.cost_center) || 'Unnamed cost center';
  const members = Array.isArray(detail.merged_group_costcenters)
    ? detail.merged_group_costcenters.map(cleanLabel).filter(Boolean)
    : [];
  return members.length ? `${label} (merged: ${members.join(', ')})` : label;
}

export function toggleCenter(selected: readonly string[], label: string): string[] {
  const n = normalizeLabel(label);
  return selected.some((s) => normalizeLabel(s) === n)
    ? selected.filter((s) => normalizeLabel(s) !== n)
    : [...selected, label];
}

export function selectAll(): string[] {
  return [];
}