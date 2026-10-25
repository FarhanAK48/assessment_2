
import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { AVAILABLE_MONTHS, DEFAULT_MONTH } from '../config/months';
import { EngagementType } from '../models/performance.model';
import { normalizeEngagements } from '../utils/cost-center';

export interface StoredFilters {
  month: string;
  centers: string[];
  engagements: EngagementType[];
}

/** Persists the selected month and both filters. Never throws (private mode, quota, bad JSON). */
@Injectable({ providedIn: 'root' })
export class FilterStorageService {
  static readonly KEY = 'logistics-dashboard:filters:v1';

  private readonly storage: Storage | null = this.resolveStorage(inject(DOCUMENT));

  load(): StoredFilters {
    const defaults: StoredFilters = { month: DEFAULT_MONTH, centers: [], engagements: [] };
    try {
      const raw = this.storage?.getItem(FilterStorageService.KEY);
      if (!raw) return defaults;

      const parsed = JSON.parse(raw);
      const month = AVAILABLE_MONTHS.some((m) => m.value === parsed?.month)
        ? (parsed.month as string)
        : DEFAULT_MONTH;

      const centers: string[] = Array.isArray(parsed?.centers)
        ? [
            ...new Set<string>(
              parsed.centers
                .filter((c: unknown): c is string => typeof c === 'string')
                .map((c: string) => c.trim())
                .filter(Boolean)
            ),
          ]
        : [];

      const engagements = normalizeEngagements(
        Array.isArray(parsed?.engagements) ? parsed.engagements : []
      );

      return { month, centers, engagements };
    } catch {
      return defaults;
    }
  }

  save(filters: StoredFilters): void {
    try {
      this.storage?.setItem(FilterStorageService.KEY, JSON.stringify(filters));
    } catch {
      /* storage unavailable or full: the dashboard still works */
    }
  }

  private resolveStorage(doc: Document): Storage | null {
    try {
      return doc.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }
}