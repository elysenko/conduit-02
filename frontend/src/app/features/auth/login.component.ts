import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth.store';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);

  /** Preview-only affordance; folded out of production bundles by the build constant. */
  protected readonly previewShortcut = COLOSSUS_PREVIEW ? 'Skip login — Demo Mode' : '';

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  protected readonly errors = signal<string[]>([]);
  protected readonly submitting = signal(false);

  protected async submit(): Promise<void> {
    this.errors.set([]);
    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();
    const result = await this.auth.login(email, password);
    this.submitting.set(false);

    if (result.ok) {
      void this.router.navigate(['/']);
    } else {
      this.errors.set(result.errors);
    }
  }

  protected useDemoMode(): void {
    this.auth.previewSignIn();
    void this.router.navigate(['/']);
  }
}
