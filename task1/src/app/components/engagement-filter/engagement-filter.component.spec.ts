import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EngagementFilterComponent } from './engagement-filter.component';

describe('EngagementFilterComponent', () => {
  let component: EngagementFilterComponent;
  let fixture: ComponentFixture<EngagementFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EngagementFilterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EngagementFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
