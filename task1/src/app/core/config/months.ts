export interface MonthOption {
  value: string; // YYYY-MM
  label: string;
}

export const AVAILABLE_MONTHS: MonthOption[] = [
  { value: '2026-09', label: 'September 2026' },
  { value: '2026-10', label: 'October 2026' },
];

export const DEFAULT_MONTH = '2026-09';