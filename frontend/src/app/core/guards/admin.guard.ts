import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth.store';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  if (COLOSSUS_PREVIEW) {
    if (!auth.isAdmin()) {
      auth.previewSignIn({ role: 'ADMIN' });
    }
    return true;
  }

  return auth.isAdmin() ? true : router.createUrlTree(['/']);
};
