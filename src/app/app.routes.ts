import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent) },
  { path: 'jacobi', loadComponent: () => import('./pages/jacobi/jacobi').then(m => m.JacobiComponent) },
  { path: 'horner', loadComponent: () => import('./pages/horner/horner').then(m => m.HornerComponent) },
  { path: '**', redirectTo: '' }
];
