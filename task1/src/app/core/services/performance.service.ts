
import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, defer, map, of, switchMap, tap, throwError, timer } from 'rxjs';
import { PerformanceResponse } from '../models/performance.model';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export interface CachedResponse {
  res: PerformanceResponse;
  /** epoch ms when this response was received */
  fetchedAt: number;
}

export interface MockApiConfig {
  minLatencyMs: number;
  maxLatencyMs: number;
  /** 0.1 = 10% of requests fail */
  failureRate: number;
  random: () => number;
  now: () => number;
}

export const MOCK_API_CONFIG = new InjectionToken<MockApiConfig>('MOCK_API_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    minLatencyMs: 300,
    maxLatencyMs: 3000,
    failureRate: 0.1,
    random: () => Math.random(),
    now: () => Date.now(),
  }),
});

export class MockApiError extends Error {
  constructor(message: string, readonly month: string) {
    super(message);
    this.name = 'MockApiError';
  }
}

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(MOCK_API_CONFIG);
  private readonly cache = new Map<string, CachedResponse>();

  static readonly BASE_URL = 'assets/mock';

  peek(month: string): CachedResponse | null {
    return this.cache.get(month) ?? null;
  }

 
  load(month: string, options: { refresh?: boolean } = {}): Observable<CachedResponse> {
    if (!MONTH_PATTERN.test(month)) {
      return throwError(() => new MockApiError(`Invalid month: ${month}`, month));
    }

    if (!options.refresh) {
      const hit = this.cache.get(month);
      if (hit) return of(hit);
    }

    return defer(() => {
      const latency = this.nextLatency();
      const fails = this.config.random() < this.config.failureRate;

      return timer(latency).pipe(
        switchMap(() =>
          fails
            ? throwError(() => new MockApiError('Simulated request failure', month))
            : this.http.get<PerformanceResponse>(
                `${PerformanceService.BASE_URL}/mock-performance-${month}.json`
              )
        ),
        map((res): CachedResponse => ({ res, fetchedAt: this.config.now() })),
        tap((entry) => this.cache.set(month, entry))
      );
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

    getMonth(month: string): Observable<PerformanceResponse> {
    return this.http.get<PerformanceResponse>(
      `assets/data/${month}.json`
    );
  }

  /** Whole milliseconds in [min, max] */
  private nextLatency(): number {
    const { minLatencyMs: min, maxLatencyMs: max, random } = this.config;
    return Math.min(max, min + Math.floor(random() * (max - min + 1)));
  }
}