import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import {
  BehaviorSubject, Observable, Subject, catchError, combineLatest, map, merge, of, startWith, switchMap,
} from 'rxjs';
import { CostCenterComponent } from '../../components/cost-center/cost-center.component';
import { EngagementFilterComponent } from '../../components/engagement-filter/engagement-filter.component';
import { AVAILABLE_MONTHS } from '../../core/config/months';
import { DashboardState, EngagementType } from '../../core/models/performance.model';
import { FilterStorageService } from '../../core/services/filter-storage.service';
import { CachedResponse, PerformanceService } from '../../core/services/performance.service';
import { normalizeLabel } from '../../core/utils/cost-center';
import { toViewModel } from '../../core/utils/report.mapper';
import { SummaryTableComponent } from '../../components/summary-table/summary-table.component';

/** Load status for ONE month. entry is that month's last valid data, never another month's. */
interface LoadState {
  month: string;
  entry: CachedResponse | null;
  loading: boolean;
  failed: boolean;
}

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
export class DashboardComponent implements OnDestroy {
  private readonly api = inject(PerformanceService);
  private readonly storage = inject(FilterStorageService);

  private readonly saved = this.storage.load();
  private readonly month$ = new BehaviorSubject<string>(this.saved.month);
  private readonly centers$ = new BehaviorSubject<string[]>(this.saved.centers);
  private readonly engagements$ = new BehaviorSubject<EngagementType[]>(this.saved.engagements);
  private readonly refresh$ = new Subject<void>();

  readonly months = AVAILABLE_MONTHS;

  /** A month change uses the cache. Refresh bypasses it. */
  private readonly request$ = merge(
    this.month$.pipe(map((month) => ({ month, refresh: false }))),
    this.refresh$.pipe(map(() => ({ month: this.month$.value, refresh: true })))
  );

  /**
   * switchMap unsubscribes the previous request (and its timer) whenever a new one starts.
   * A slow September response can therefore never replace October's data, loading or error.
   */
  private readonly load$: Observable<LoadState> = this.request$.pipe(
    switchMap(({ month, refresh }) => this.load(month, refresh))
  );

  /** The template's single async pipe is the only subscription. */
  readonly view$ = combineLatest([this.load$, this.centers$, this.engagements$]).pipe(
    map(([load, centers, engagements]) => this.buildView(load, centers, engagements))
  );

  private load(month: string, refresh: boolean): Observable<LoadState> {
    const cached = this.api.peek(month);

    if (cached && !refresh) {
      return of({ month, entry: cached, loading: false, failed: false });
    }

    return this.api.load(month, { refresh: true }).pipe(
      map((entry): LoadState => ({ month, entry, loading: false, failed: false })),
      // a failure keeps the last valid cached entry for THIS month
      catchError(() => of<LoadState>({ month, entry: cached, loading: false, failed: true })),
      startWith<LoadState>({ month, entry: cached, loading: true, failed: false })
    );
  }

  private buildView(load: LoadState, centers: string[], engagements: EngagementType[]) {
    let selected = centers;
    let state: DashboardState;

    if (load.entry) {
      state = toViewModel(load.entry.res, selected, engagements);

      // Drop restored selections that don't exist in this month's data
      const known = new Set((state.costCenters ?? []).map((o) => normalizeLabel(o.label)));
      const valid = selected.filter((label) => known.has(normalizeLabel(label)));
      if (valid.length !== selected.length) {
        selected = valid;
        state = toViewModel(load.entry.res, valid, engagements);
      }
    } else {
      state = load.loading ? LOADING : ERROR;
    }

    return {
      month: load.month,
      selected,
      engagements,
      state,
      fetchedAt: load.entry?.fetchedAt ?? null,
      busy: load.loading,
      // refresh failed but older valid data is still on screen
      refreshFailed: load.failed && !!load.entry,
    };
  }

  monthLabel(month: string): string {
    return this.months.find((m) => m.value === month)?.label ?? month;
  }

  onMonthChange(month: string): void {
    if (!this.months.some((m) => m.value === month)) return;
    this.centers$.next([]); // centers differ per month: back to All
    this.month$.next(month);
    this.persist();
  }

  onSelectionChange(labels: string[]): void {
    this.centers$.next(labels);
    this.persist();
  }

  onEngagementChange(types: EngagementType[]): void {
    this.engagements$.next(types);
    this.persist();
  }

  /** Bypasses the cache and makes a new request for the selected month. */
  refresh(): void {
    this.refresh$.next();
  }
  hasMonth(month: string): boolean {
  return this.months.some((m) => m.value === month);
}

  private persist(): void {
    this.storage.save({
      month: this.month$.value,
      centers: this.centers$.value,
      engagements: this.engagements$.value,
    });
  }

  ngOnDestroy(): void {
    this.month$.complete();
    this.centers$.complete();
    this.engagements$.complete();
    this.refresh$.complete();
  }
}