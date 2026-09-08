import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth.store';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);

  protected readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    email: ['', [Validators.required]],
    password: ['', [Validators.required]],
    confirmPassword: ['', [Validators.required]],
  });

  protected readonly errors = signal<string[]>([]);
  protected readonly submitting = signal(false);

  protected async submit(): Promise<void> {
    const { username, email, password, confirmPassword } = this.form.getRawValue();
    if (password !== confirmPassword) {
      this.errors.set(['passwords do not match']);
      return;
    }

    this.errors.set([]);
    this.submitting.set(true);
    const result = await this.auth.register(username, email, password);
    this.submitting.set(false);

    if (result.ok) {
      void this.router.navigate(['/']);
    } else {
      this.errors.set(result.errors);
    }
  }
}
