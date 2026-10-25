import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BehaviorSubject, catchError, combineLatest, distinctUntilChanged, map, Observable, of, startWith, switchMap,
} from 'rxjs';
import { CostCenterComponent } from '../../components/cost-center/cost-center.component';
import { EngagementFilterComponent } from '../../components/engagement-filter/engagement-filter.component';
import { AVAILABLE_MONTHS, DEFAULT_MONTH } from '../../core/config/months';
import { DashboardState, EngagementType, PerformanceResponse } from '../../core/models/performance.model';
import { PerformanceApiService } from '../../core/services/performance.service';
import { toViewModel } from '../../core/utils/report.mapper';
import { SummaryTableComponent } from '../../components/summary-table/summary-table.component';

type ResponseState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; res: PerformanceResponse };

const LOADING: DashboardState = { status: 'loading', rows: [], range: null };
const ERROR: DashboardState = {
  status: 'error',
  rows: [],
  range: null,
  message: 'We could not load the performance data for this month.',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SummaryTableComponent, CostCenterComponent, EngagementFilterComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly api = inject(PerformanceApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly retry$ = new BehaviorSubject<void>(undefined);
  /** selected cost center labels. Empty = All. */
  private readonly selection$ = new BehaviorSubject<string[]>([]);
  /** selected engagement types. Empty = combined tables. */
  private readonly engagement$ = new BehaviorSubject<EngagementType[]>([]);

  readonly months = AVAILABLE_MONTHS;

  private readonly month$: Observable<string> = this.route.paramMap.pipe(
    map((p) => p.get('month') ?? DEFAULT_MONTH),
    distinctUntilChanged()
  );

  /** The ONLY stream that calls the API: once per month or Retry. Filters never reach it. */
  private readonly response$: Observable<ResponseState> = combineLatest([this.month$, this.retry$]).pipe(
    switchMap(([month]) =>
      this.api.getMonth(month).pipe(
        map((res): ResponseState => ({ status: 'success', res })),
        catchError(() => of<ResponseState>({ status: 'error' })),
        startWith<ResponseState>({ status: 'loading' })
      )
    )
  );

  readonly view$ = combineLatest([this.month$, this.response$, this.selection$, this.engagement$]).pipe(
    map(([month, response, selected, engagements]) => ({
      month,
      selected,
      engagements,
      state: this.toState(response, selected, engagements),
    }))
  );

  constructor() {
    this.month$.pipe(takeUntilDestroyed()).subscribe(() => this.selection$.next([]));
  }

  private toState(
    response: ResponseState,
    selected: string[],
    engagements: EngagementType[]
  ): DashboardState {
    switch (response.status) {
      case 'loading':
        return LOADING;
      case 'error':
        return ERROR;
      default:
        return toViewModel(response.res, selected, engagements);
    }
  }

  monthLabel(month: string): string {
    return this.months.find((m) => m.value === month)?.label ?? month;
  }

  hasMonth(month: string): boolean {
    return this.months.some((m) => m.value === month);
  }

  onMonthChange(month: string): void {
    this.router.navigate(['/dashboard', month]);
  }

  onSelectionChange(labels: string[]): void {
    this.selection$.next(labels);
  }

  onEngagementChange(types: EngagementType[]): void {
    this.engagement$.next(types);
  }

  retry(): void {
    this.retry$.next();
  }
}