import { Routes } from '@angular/router';
import { DEFAULT_MONTH } from './core/config/months';


export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: `dashboard/${DEFAULT_MONTH}` },
  {
    path: 'dashboard/:month',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  { path: '**', redirectTo: `dashboard/${DEFAULT_MONTH}` },
];