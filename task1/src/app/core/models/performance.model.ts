export interface PerformanceResponse {
  status?: number;
  message?: string;
  data?: {
    report?: Record<string, any>;
    details?: CostCenterDetail[];
  };
}

export type ValueKind = 'money' | 'percentage' | 'count';

export type RowStatus = 'favorable' | 'unfavorable' | 'neutral';

export interface SummaryRow {
  key: string;
  label: string;
  kind: ValueKind;
  target: number;
  actual: number;
  variance: number;
  variancePct: number | null;
  status: RowStatus;
}

export interface DateRange {
  from: string;
  to: string;
}




export interface DashboardState {
  status: 'loading' | 'error' | 'empty' | 'success';
  rows: SummaryRow[];
  range: DateRange | null;
  message?: string;
  costCenters?: CostCenterOption[];   // <-- added: options for the filter
  includedCenters?: string[];         // <-- added: response rows being shown ([] = All)
}

export interface CostCenterDetail {
  cost_center?: string;
  cost_code?: string;
  merge_group_id?: number | string | null;
  merged_group_costcenters?: string[] | null;
  tables?: Record<string, TotalsTable | undefined>;
  engagement_tables?: Record<string, Record<string, TotalsTable | undefined> | undefined>;
}

export interface CostCenterOption {
  label: string;
  memberOf?: string;
}

export const ENGAGEMENT_TYPES = ['Own', 'Rented', 'Hired'] as const;
export type EngagementType = (typeof ENGAGEMENT_TYPES)[number];

export interface TotalsTable {
  total?: { target?: number; actual?: number };
}