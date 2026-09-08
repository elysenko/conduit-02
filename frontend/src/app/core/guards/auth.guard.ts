import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth.store';

/** Redirects at most once, and never from a route it has already allowed. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  if (COLOSSUS_PREVIEW) {
    // Static preview: a cold load of a guarded route must render that screen
    // rather than bouncing a reviewer to /login.
    auth.previewSignIn();
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
