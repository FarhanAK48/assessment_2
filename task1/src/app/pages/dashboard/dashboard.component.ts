import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BehaviorSubject, catchError, combineLatest, distinctUntilChanged, map, Observable, of, startWith, switchMap,
} from 'rxjs';
import { AVAILABLE_MONTHS, DEFAULT_MONTH } from '../../core/config/months';
import { DashboardState } from '../../core/models/performance.model';
import { PerformanceApiService } from '../../core/services/performance.service';
import { toViewModel } from '../../core/utils/report.mapper';
import { SummaryTableComponent } from '../../components/summary-table/summary-table.component';

const LOADING: DashboardState = { status: 'loading', rows: [], range: null };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SummaryTableComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
  export class DashboardComponent {
    private readonly api = inject(PerformanceApiService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly retry$ = new BehaviorSubject<void>(undefined);

    readonly months = AVAILABLE_MONTHS;

    readonly month$: Observable<string> = this.route.paramMap.pipe(
      map((p) => p.get('month') ?? DEFAULT_MONTH),
      distinctUntilChanged()
    );

    readonly vm$: Observable<DashboardState> = combineLatest([this.month$, this.retry$]).pipe(
      switchMap(([month]) =>
        this.api.getMonth(month).pipe(
          map((res) => toViewModel(res)),
          catchError(() =>
            of<DashboardState>({
              status: 'error',
              rows: [],
              range: null,
              message: 'We could not load the performance data for this month.',
            })
          ),
          startWith(LOADING)
        )
      )
    );

    monthLabel(month: string): string {
      return this.months.find((m) => m.value === month)?.label ?? month;
    }

    hasMonth(month: string): boolean {
      return this.months.some((m) => m.value === month);
    }

    onMonthChange(month: string): void {
      this.router.navigate(['/dashboard', month]);
    }

    retry(): void {
      this.retry$.next();
    }
  }
