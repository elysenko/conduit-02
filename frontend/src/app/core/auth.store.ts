import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { clearStored, readStored, writeStored } from './storage';
import { DEMO_USER } from './mock-data';
import type { Role, User } from './models';

const USER_KEY = 'user';
const TOKEN_KEY = 'token';
const ROLES: Role[] = ['ADMIN', 'MANAGER', 'USER'];

export interface AuthResult {
  ok: boolean;
  errors: string[];
}

/** Untrusted-input guard: anything restored from browser storage must be re-validated. */
function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<User>;
  return (
    typeof candidate.username === 'string' &&
    candidate.username.length > 0 &&
    typeof candidate.email === 'string' &&
    typeof candidate.token === 'string' &&
    typeof candidate.role === 'string' &&
    ROLES.includes(candidate.role as Role)
  );
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');
  readonly pending = signal(false);

  constructor() {
    this.restore();
  }

  /** Never throws and never blanks the page: bad state is cleared, not propagated. */
  private restore(): void {
    try {
      const raw = readStored(USER_KEY);
      if (!raw) {
        return;
      }
      const parsed: unknown = JSON.parse(raw);
      if (isUser(parsed)) {
        this.currentUser.set(parsed);
      } else {
        clearStored([USER_KEY, TOKEN_KEY]);
      }
    } catch {
      clearStored([USER_KEY, TOKEN_KEY]);
    }
  }

  private persist(user: User): void {
    this.currentUser.set(user);
    writeStored(USER_KEY, JSON.stringify(user));
    writeStored(TOKEN_KEY, user.token);
  }

  /** Seeds the signed-in preview session. Used by the demo shortcut and the guards. */
  previewSignIn(overrides: Partial<User> = {}): User {
    const user: User = { ...DEMO_USER, ...overrides };
    this.persist(user);
    return user;
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const errors = validateCredentials(email, password);
    if (errors.length > 0) {
      return { ok: false, errors };
    }

    if (COLOSSUS_PREVIEW) {
      // Preview builds have no API server: resolve the session locally and
      // synchronously so a well-formed submission always reaches the app.
      this.previewSignIn({ email, username: usernameFrom(email) });
      return { ok: true, errors: [] };
    }

    this.pending.set(true);
    try {
      const response = await firstValueFrom(
        this.http.post<{ user: User }>('/api/users/login', { user: { email, password } }),
      );
      this.persist(response.user);
      return { ok: true, errors: [] };
    } catch {
      return { ok: false, errors: ['email or password is invalid'] };
    } finally {
      this.pending.set(false);
    }
  }

  async register(username: string, email: string, password: string): Promise<AuthResult> {
    const errors = validateCredentials(email, password);
    if (!username.trim()) {
      errors.unshift("username can't be blank");
    }
    if (errors.length > 0) {
      return { ok: false, errors };
    }

    if (COLOSSUS_PREVIEW) {
      this.previewSignIn({ email, username: username.trim(), bio: null, role: 'USER' });
      return { ok: true, errors: [] };
    }

    this.pending.set(true);
    try {
      const response = await firstValueFrom(
        this.http.post<{ user: User }>('/api/users', { user: { username, email, password } }),
      );
      this.persist(response.user);
      return { ok: true, errors: [] };
    } catch {
      return { ok: false, errors: ['username or email is already taken'] };
    } finally {
      this.pending.set(false);
    }
  }

  async updateUser(patch: Partial<User>): Promise<AuthResult> {
    const current = this.currentUser();
    if (!current) {
      return { ok: false, errors: ['you must be signed in'] };
    }
    if (COLOSSUS_PREVIEW) {
      this.persist({ ...current, ...patch });
      return { ok: true, errors: [] };
    }
    this.pending.set(true);
    try {
      const response = await firstValueFrom(
        this.http.put<{ user: User }>('/api/user', { user: patch }),
      );
      this.persist(response.user);
      return { ok: true, errors: [] };
    } catch {
      return { ok: false, errors: ['could not save your settings'] };
    } finally {
      this.pending.set(false);
    }
  }

  logout(): void {
    this.currentUser.set(null);
    clearStored([USER_KEY, TOKEN_KEY]);
    void this.router.navigate(['/login']);
  }
}

function usernameFrom(email: string): string {
  const local = email.split('@')[0] ?? 'reader';
  return local.replace(/[^a-zA-Z0-9._-]/g, '') || 'reader';
}

function validateCredentials(email: string, password: string): string[] {
  const errors: string[] = [];
  if (!email.trim()) {
    errors.push("email can't be blank");
  } else if (!/^[^\s@]+@[^\s@]+$/.test(email.trim())) {
    errors.push('email must look like an address');
  }
  if (!password) {
    errors.push("password can't be blank");
  } else if (password.length < 8) {
    errors.push('password must be at least 8 characters');
  }
  return errors;
}
