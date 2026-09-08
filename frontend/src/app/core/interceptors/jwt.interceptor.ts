import { HttpInterceptorFn } from '@angular/common/http';
import { readStored } from '../storage';

/** RealWorld convention: `Authorization: Token <jwt>`. */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = readStored('token');
  if (!token) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Token ${token}` } }));
};
