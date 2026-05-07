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
    path: '',
    canMatch: [authGuard],
    loadComponent: () => import('./layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard-home/dashboard-home.component').then((m) => m.DashboardHomeComponent),
      },
      {
        path: 'transactions/new',
        loadComponent: () =>
          import('./pages/charge-create/charge-create.component').then((m) => m.ChargeCreateComponent),
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./pages/transactions/transactions.component').then((m) => m.TransactionsComponent),
      },
      {
        path: 'cards/new',
        loadComponent: () => import('./pages/card-add/card-add.component').then((m) => m.CardAddComponent),
      },
      {
        path: 'cards',
        loadComponent: () => import('./pages/cards/cards.component').then((m) => m.CardsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
