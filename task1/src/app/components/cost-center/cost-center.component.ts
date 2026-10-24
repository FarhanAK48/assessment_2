// import { CommonModule } from '@angular/common';
// import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
// import { CostCenterOption } from '../../core/models/performance.model';
// import { normalizeLabel, selectAll, toggleCenter } from '../../core/utils/cost-center';

// @Component({
//   selector: 'app-cost-center',
//   standalone: true,
//   imports: [CommonModule],
//   templateUrl: './cost-center.component.html',
//   styleUrl: './cost-center.component.scss'
// })
// export class CostCenterComponent {

//    @Input() options: CostCenterOption[] = [];
//   /** empty = All */
//   @Input() selected: string[] = [];
//   @Output() selectionChange = new EventEmitter<string[]>();

//   query = '';

//   trackByLabel = (_: number, option: CostCenterOption) => option.label;

//   get allSelected(): boolean {
//     return this.selected.length === 0;
//   }

//   get visible(): CostCenterOption[] {
//     const q = normalizeLabel(this.query);
//     return q ? this.options.filter((o) => normalizeLabel(o.label).includes(q)) : this.options;
//   }

//   isChecked(label: string): boolean {
//     const n = normalizeLabel(label);
//     return this.selected.some((s) => normalizeLabel(s) === n);
//   }

//   onSearch(event: Event): void {
//     this.query = (event.target as HTMLInputElement).value;
//   }

//   toggle(label: string): void {
//     this.selectionChange.emit(toggleCenter(this.selected, label));
//   }

//   onSelectAll(event: Event): void {
//     // "All" cannot be unticked by itself: keep the box checked
//     (event.target as HTMLInputElement).checked = true;
//     this.selectionChange.emit(selectAll());
//   }
// }


import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CostCenterOption } from '../../core/models/performance.model';
import { normalizeLabel, selectAll, toggleCenter } from '../../core/utils/cost-center';

@Component({
  selector: 'app-cost-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cost-center.component.html',
  styleUrl: './cost-center.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostCenterComponent {
   @Input() options: CostCenterOption[] = [];
  @Input() selected: string[] = [];
  @Output() selectionChange = new EventEmitter<string[]>();

  query = '';

  trackByLabel = (_: number, option: CostCenterOption) => option.label;

  get allSelected(): boolean {
    return this.selected.length === 0;
  }

  get visible(): CostCenterOption[] {
    const q = normalizeLabel(this.query);
    return q ? this.options.filter((o) => normalizeLabel(o.label).includes(q)) : this.options;
  }

  isChecked(label: string): boolean {
    const n = normalizeLabel(label);
    return this.selected.some((s) => normalizeLabel(s) === n);
  }

  onSearch(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
  }

  toggle(label: string): void {
    this.selectionChange.emit(toggleCenter(this.selected, label));
  }

  onSelectAll(event: Event): void {
    // "All" cannot be unticked by itself: keep the box checked
    (event.target as HTMLInputElement).checked = true;
    this.selectionChange.emit(selectAll());
  }
}