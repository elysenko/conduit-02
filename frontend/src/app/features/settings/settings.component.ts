import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthStore } from '../../core/auth.store';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthStore);

  protected readonly errors = signal<string[]>([]);
  protected readonly saved = signal(false);
  protected readonly submitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    image: [this.auth.currentUser()?.image ?? ''],
    username: [this.auth.currentUser()?.username ?? ''],
    bio: [this.auth.currentUser()?.bio ?? ''],
    email: [this.auth.currentUser()?.email ?? ''],
    password: [''],
  });

  protected async submit(): Promise<void> {
    const { image, username, bio, email } = this.form.getRawValue();
    const problems: string[] = [];
    if (!username.trim()) {
      problems.push("username can't be blank");
    }
    if (!email.trim()) {
      problems.push("email can't be blank");
    }
    if (problems.length > 0) {
      this.errors.set(problems);
      this.saved.set(false);
      return;
    }

    this.errors.set([]);
    this.submitting.set(true);
    const result = await this.auth.updateUser({
      image: image.trim() || null,
      username: username.trim(),
      bio: bio.trim() || null,
      email: email.trim(),
    });
    this.submitting.set(false);

    if (result.ok) {
      this.saved.set(true);
      this.form.patchValue({ password: '' });
    } else {
      this.errors.set(result.errors);
    }
  }

  protected logout(): void {
    this.auth.logout();
  }
}
