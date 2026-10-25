
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ENGAGEMENT_TYPES, EngagementType } from '../../core/models/performance.model';
import { toggleEngagement } from '../../core/utils/cost-center';

@Component({
  selector: 'app-engagement-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './engagement-filter.component.html',
  styleUrl: './engagement-filter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EngagementFilterComponent {
  /** empty = none selected (combined data) */
  @Input() selected: EngagementType[] = [];
  @Output() selectionChange = new EventEmitter<EngagementType[]>();

  readonly types = ENGAGEMENT_TYPES;

  isChecked(type: EngagementType): boolean {
    return this.selected.includes(type);
  }

  toggle(type: EngagementType): void {
    this.selectionChange.emit(toggleEngagement(this.selected, type));
  }
}