export interface PerformanceResponse {
  status?: number;
  message?: string;
  data?: {
    report?: Record<string, any>;
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
}