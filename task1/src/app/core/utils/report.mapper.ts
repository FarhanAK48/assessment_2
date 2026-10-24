// import {
//   DashboardState,
//   PerformanceResponse,
//   SummaryRow,
//   ValueKind,
//   RowStatus,
// } from '../models/performance.model';

// type Calc = 'standard' | 'adjustedGp' | 'gpPct';

// interface MetricDef {
//   key: string;
//   label: string;
//   source: string;
//   isCost: boolean;
//   kind: ValueKind;
//   calc: Calc;
//   noVariancePct?: boolean;
// }

// const METRICS: MetricDef[] = [
//   { key: 'revenue', label: 'Revenue', source: 'revenue', isCost: false, kind: 'money', calc: 'standard' },
//   { key: 'gp', label: 'Gross Profit', source: 'gp', isCost: false, kind: 'money', calc: 'adjustedGp' },
//   { key: 'gp_pct', label: 'GP %', source: 'gp', isCost: false, kind: 'percentage', calc: 'gpPct', noVariancePct: true },
//   { key: 'fuel_cost', label: 'Fuel Cost', source: 'fuel_cost', isCost: true, kind: 'money', calc: 'standard' },
//   { key: 'toll_cost', label: 'Toll Cost', source: 'toll_cost', isCost: true, kind: 'money', calc: 'standard' },
//   { key: 'other_costs', label: 'Other Costs', source: 'other_costs', isCost: true, kind: 'money', calc: 'standard' },
//   { key: 'repair_cost', label: 'Repair Cost', source: 'repair_cost', isCost: true, kind: 'money', calc: 'standard' },
//   { key: 'budgeted_km', label: 'Budgeted KMs', source: 'budgeted_km', isCost: false, kind: 'count', calc: 'standard' },
//   { key: 'approved_km', label: 'Approved KMs', source: 'approved_km', isCost: false, kind: 'count', calc: 'standard' },
//   { key: 'trips', label: 'Number of Trips', source: 'trips', isCost: false, kind: 'count', calc: 'standard' },
// ];

// const GP_ADJUSTMENT_FACTOR = 1.15 * 0.07;

// const num = (value: unknown): number =>
//   typeof value === 'number' && Number.isFinite(value) ? value : 0;

// const round2 = (n: number): number => {
//   const rounded = (Math.sign(n) * Math.round((Math.abs(n) + Number.EPSILON) * 100)) / 100;
//   return rounded || 0;
// };

// const adjustedGP = (rawGP: number, revenue: number): number =>
//   rawGP - revenue * GP_ADJUSTMENT_FACTOR;

// const gpPct = (adjGP: number, revenue: number): number =>
//   revenue === 0 ? 0 : (adjGP / revenue) * 100;

// function getStatus(variance: number): RowStatus {
//   if (variance > 0) return 'favorable';
//   if (variance < 0) return 'unfavorable';
//   return 'neutral';
// }

// interface Pair {
//   target: number;
//   actual: number;
// }

// function readPair(report: Record<string, any>, source: string): Pair {
//   return {
//     target: num(report[source]?.target),
//     actual: num(report[source]?.actual),
//   };
// }

// export function toViewModel(
//   res: PerformanceResponse | null | undefined
// ): DashboardState {
//   const report = res?.data?.report;

//   const hasData =
//     !!report &&
//     METRICS.some((metric) => {
//       const value = report[metric.source];
//       return value !== null && typeof value === 'object' && !Array.isArray(value);
//     });

//   if (!report || !hasData) {
//     return {
//       status: 'empty',
//       rows: [],
//       range: null,
//       message: 'No performance data available.',
//     };
//   }

//   const revenue = readPair(report, 'revenue');
//   const rawGp = readPair(report, 'gp');

//   // Each side uses its OWN revenue
//   const adjTarget = adjustedGP(rawGp.target, revenue.target);
//   const adjActual = adjustedGP(rawGp.actual, revenue.actual);

//   const rows: SummaryRow[] = METRICS.map((metric) => {
//     let rawTarget: number;
//     let rawActual: number;

//     switch (metric.calc) {
//       case 'adjustedGp':
//         rawTarget = adjTarget;
//         rawActual = adjActual;
//         break;
//       case 'gpPct':
//         rawTarget = gpPct(adjTarget, revenue.target);
//         rawActual = gpPct(adjActual, revenue.actual);
//         break;
//       default: {
//         const pair = readPair(report, metric.source);
//         rawTarget = pair.target;
//         rawActual = pair.actual;
//       }
//     }

//     const target = round2(rawTarget);
//     const actual = round2(rawActual);

//     const variance = round2(metric.isCost ? target - actual : actual - target);

//     const variancePct = metric.noVariancePct
//       ? null
//       : target === 0
//         ? 0
//         : round2((variance / target) * 100);

//     const status = getStatus(variance);

//     return {
//       key: metric.key,
//       label: metric.label,
//       kind: metric.kind,
//       target,
//       actual,
//       variance,
//       variancePct,
//       status,
//     };
//   });

//   const [from, to] = String(report['date'] ?? '')
//     .split(/\s+to\s+/i)
//     .map((date) => date.trim());

//   const range = from && to ? { from, to } : null;

//   return {
//     status: 'success',
//     rows,
//     range,
//   };
// }



import {
  CostCenterOption,
  DashboardState,
  PerformanceResponse,
  RowStatus,
  SummaryRow,
  ValueKind,
} from '../models/performance.model';
import {
  Pair,
  aggregateTotals,
  buildCostCenterIndex,
  describeRow,
  resolveSelectedRows,
  toNumber,
} from './cost-center';

/** How a row's target/actual values are produced. */
type Calc = 'standard' | 'adjustedGp' | 'gpPct';

interface MetricDef {
  key: string;
  label: string;
  source: string;
  isCost: boolean;
  kind: ValueKind;
  calc: Calc;
  /** true => Variance % column shows "N/A" (GP % row) */
  noVariancePct?: boolean;
}

const METRICS: MetricDef[] = [
  { key: 'revenue', label: 'Revenue', source: 'revenue', isCost: false, kind: 'money', calc: 'standard' },
  { key: 'gp', label: 'Gross Profit', source: 'gp', isCost: false, kind: 'money', calc: 'adjustedGp' },
  { key: 'gp_pct', label: 'GP %', source: 'gp', isCost: false, kind: 'percentage', calc: 'gpPct', noVariancePct: true },
  { key: 'fuel_cost', label: 'Fuel Cost', source: 'fuel_cost', isCost: true, kind: 'money', calc: 'standard' },
  { key: 'toll_cost', label: 'Toll Cost', source: 'toll_cost', isCost: true, kind: 'money', calc: 'standard' },
  { key: 'other_costs', label: 'Other Costs', source: 'other_costs', isCost: true, kind: 'money', calc: 'standard' },
  { key: 'repair_cost', label: 'Repair Cost', source: 'repair_cost', isCost: true, kind: 'money', calc: 'standard' },
  { key: 'budgeted_km', label: 'Budgeted KMs', source: 'budgeted_km', isCost: false, kind: 'count', calc: 'standard' },
  { key: 'approved_km', label: 'Approved KMs', source: 'approved_km', isCost: false, kind: 'count', calc: 'standard' },
  { key: 'trips', label: 'Number of Trips', source: 'trips', isCost: false, kind: 'count', calc: 'standard' },
];

/** adjustedGP = rawGP − (revenue × 1.15 × 0.07) */
const GP_ADJUSTMENT_FACTOR = 1.15 * 0.07;

const num = toNumber;

/** Sign-safe 2-decimal rounding. Never returns -0. */
const round2 = (n: number): number => {
  const rounded = (Math.sign(n) * Math.round((Math.abs(n) + Number.EPSILON) * 100)) / 100;
  return rounded || 0;
};

const adjustedGP = (rawGP: number, revenue: number): number =>
  rawGP - revenue * GP_ADJUSTMENT_FACTOR;

/** (adjustedGP / revenue) × 100, or 0 when revenue is 0 */
const gpPct = (adjGP: number, revenue: number): number =>
  revenue === 0 ? 0 : (adjGP / revenue) * 100;

function getStatus(variance: number): RowStatus {
  if (variance > 0) return 'favorable';
  if (variance < 0) return 'unfavorable';
  return 'neutral';
}

const isObject = (v: unknown): v is Record<string, any> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

function hasMetrics(report: Record<string, any> | undefined): report is Record<string, any> {
  return !!report && METRICS.some((metric) => isObject(report[metric.source]));
}

/** Reads target/actual of one metric from the overall report (source variance/status ignored). */
function readFromReport(report: Record<string, any>, source: string): Pair {
  return { target: num(report[source]?.target), actual: num(report[source]?.actual) };
}

type PairReader = (source: string) => Pair;

/** Builds the 10 rows from any data source (report, or aggregated cost centers). */
function buildRows(read: PairReader): SummaryRow[] {
  const revenue = read('revenue');
  const rawGp = read('gp');

  // Each side uses its OWN revenue
  const adjTarget = adjustedGP(rawGp.target, revenue.target);
  const adjActual = adjustedGP(rawGp.actual, revenue.actual);

  return METRICS.map((metric) => {
    let rawTarget: number;
    let rawActual: number;

    switch (metric.calc) {
      case 'adjustedGp':
        rawTarget = adjTarget;
        rawActual = adjActual;
        break;
      case 'gpPct':
        rawTarget = gpPct(adjTarget, revenue.target);
        rawActual = gpPct(adjActual, revenue.actual);
        break;
      default: {
        const pair = read(metric.source);
        rawTarget = pair.target;
        rawActual = pair.actual;
      }
    }

    // Everything below is computed from the DISPLAYED (2 decimal) values
    const target = round2(rawTarget);
    const actual = round2(rawActual);
    const variance = round2(metric.isCost ? target - actual : actual - target);

    const variancePct = metric.noVariancePct
      ? null
      : target === 0
        ? 0
        : round2((variance / target) * 100);

    return {
      key: metric.key,
      label: metric.label,
      kind: metric.kind,
      target,
      actual,
      variance,
      variancePct,
      status: getStatus(variance),
    };
  });
}

function parseRange(raw: unknown): { from: string; to: string } | null {
  const [from, to] = String(raw ?? '')
    .split(/\s+to\s+/i)
    .map((date) => date.trim());
  return from && to ? { from, to } : null;
}

function success(
  rows: SummaryRow[],
  range: { from: string; to: string } | null,
  costCenters: CostCenterOption[],
  includedCenters: string[]
): DashboardState {
  return { status: 'success', rows, range, costCenters, includedCenters };
}

/**
 * @param selectedCenters labels picked in the filter. Empty = All.
 * Pure: reads the response, never changes it.
 */
export function toViewModel(
  res: PerformanceResponse | null | undefined,
  selectedCenters: readonly string[] = []
): DashboardState {
  const report = res?.data?.report;
  const index = buildCostCenterIndex(res?.data?.details);
  const costCenters = index.options;
  const range = parseRange(report?.['date']);

  // ----- All -----
  if (selectedCenters.length === 0) {
    if (hasMetrics(report)) {
      return success(buildRows((s) => readFromReport(report, s)), range, costCenters, []);
    }
    if (index.rows.size > 0) {
      // report missing: fall back to summing every response row (each once)
      const all = [...index.rows.values()];
      return success(buildRows((s) => aggregateTotals(all, s)), range, costCenters, []);
    }
    return {
      status: 'empty',
      rows: [],
      range: null,
      message: 'No performance data available.',
      costCenters,
    };
  }

  // ----- One or more cost centers: aggregate FIRST, then recompute everything -----
  const rows = resolveSelectedRows(index, selectedCenters);
  if (rows.length === 0) {
    return {
      status: 'empty',
      rows: [],
      range,
      message: 'No data for the selected cost centers.',
      costCenters,
    };
  }

  return success(
    buildRows((s) => aggregateTotals(rows, s)),
    range,
    costCenters,
    rows.map(describeRow)
  );
}