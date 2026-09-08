import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Conduit',
    data: { flow: 'home.feed' },
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    title: 'Sign in — Conduit',
    data: { flow: 'auth.login' },
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'Sign up — Conduit',
    data: { flow: 'auth.register' },
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  { path: 'signup', redirectTo: 'register', pathMatch: 'full' },
  {
    path: 'settings',
    title: 'Your Settings — Conduit',
    data: { flow: 'user.settings' },
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/settings.component').then((m) => m.SettingsComponent),
  },
  {
    path: 'editor',
    title: 'New Article — Conduit',
    data: { flow: 'article.create' },
    canActivate: [authGuard],
    loadComponent: () => import('./features/editor/editor.component').then((m) => m.EditorComponent),
  },
  {
    path: 'editor/:slug',
    title: 'Edit Article — Conduit',
    data: { flow: 'article.edit' },
    canActivate: [authGuard],
    loadComponent: () => import('./features/editor/editor.component').then((m) => m.EditorComponent),
  },
  {
    path: 'article/:slug',
    data: { flow: 'article.detail' },
    loadComponent: () =>
      import('./features/article/article-detail.component').then((m) => m.ArticleDetailComponent),
  },
  {
    path: 'profile/:username',
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
    children: [
      {
        path: '',
        data: { flow: 'profile.articles', favorited: false },
        loadComponent: () =>
          import('./features/profile/profile-articles.component').then(
            (m) => m.ProfileArticlesComponent,
          ),
      },
      {
        path: 'favorites',
        data: { flow: 'profile.favorited', favorited: true },
        loadComponent: () =>
          import('./features/profile/profile-articles.component').then(
            (m) => m.ProfileArticlesComponent,
          ),
      },
    ],
  },
  {
    path: 'admin/settings',
    title: 'Admin Settings — Conduit',
    data: { flow: 'admin.settings' },
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-settings.component').then((m) => m.AdminSettingsComponent),
  },
  { path: '**', redirectTo: '' },
];
