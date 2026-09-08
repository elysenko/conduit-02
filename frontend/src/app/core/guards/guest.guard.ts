import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth.store';

/**
 * Keeps signed-in users off /login and /register. In preview builds it always
 * allows: the login screen is itself reviewable UI and must stay reachable.
 */
export const guestGuard: CanActivateFn = () => {
  if (COLOSSUS_PREVIEW) {
    return true;
  }
  const auth = inject(AuthStore);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/']) : true;
};
