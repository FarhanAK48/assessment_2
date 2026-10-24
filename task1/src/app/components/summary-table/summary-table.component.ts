import { CommonModule } from '@angular/common';
import {  Component, Input } from '@angular/core';
import { SummaryRow } from '../../core/models/performance.model';

@Component({
  selector: 'app-summary-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './summary-table.component.html',
  styleUrl: './summary-table.component.scss'
})
export class SummaryTableComponent {
  
   @Input() rows: SummaryRow[] = [];
  @Input() caption = 'Performance summary';

  trackByKey = (_: number, row: SummaryRow) => row.key;

  private decimals(row: SummaryRow): number {
    return row.key === 'trips' ? 0 : 2;
  }

  private fmt(value: number, decimals: number, signed = false): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      signDisplay: signed ? 'exceptZero' : 'auto',
    }).format(value || 0);
  }

  value(row: SummaryRow, v: number): string {
    const text = this.fmt(v, this.decimals(row));
    return row.kind === 'percentage' ? `${text}%` : text;
  }

  variance(row: SummaryRow): string {
    const text = this.fmt(row.variance, this.decimals(row), true);
    return row.kind === 'percentage' ? `${text} pp` : text;
  }

  variancePct(row: SummaryRow): string {
    return row.variancePct === null ? 'N/A' : `${this.fmt(row.variancePct, 2, true)}%`;
  }

  pctClass(row: SummaryRow): string {
    return row.variancePct === null ? 'neutral' : row.status;
  }
}
