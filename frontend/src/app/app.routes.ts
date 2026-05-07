import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'dashboard',
    canMatch: [authGuard],
    loadComponent: () => import('./charges/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
];
