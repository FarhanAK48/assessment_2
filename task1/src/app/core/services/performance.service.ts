import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, delay, shareReplay, throwError } from 'rxjs';
import { PerformanceResponse } from '../models/performance.model';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

@Injectable({ providedIn: 'root' })
export class PerformanceApiService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Observable<PerformanceResponse>>();

  getMonth(month: string): Observable<PerformanceResponse> {
    if (!MONTH_PATTERN.test(month)) {
      return throwError(() => new Error(`Invalid month: ${month}`));
    }

    let request$ = this.cache.get(month);
    if (!request$) {
      request$ = this.http.get(`assets/mock/mock-performance-${month}.json`)
        .pipe(
          delay(300), 
          catchError((err) => {
            this.cache.delete(month);
            return throwError(() => err);
          }),
          shareReplay({ bufferSize: 1, refCount: false })
        );
      this.cache.set(month, request$);
    }
    return request$;
  }
}