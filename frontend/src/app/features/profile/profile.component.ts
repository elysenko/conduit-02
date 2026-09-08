import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth.store';
import { ANAH, JAKE, MAYA, RILEY } from '../../core/mock-data';
import { avatarFor } from '../../core/avatar';
import type { Profile } from '../../core/models';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthStore);

  /** Backend-provided data. */
  readonly profiles = signal<Profile[]>([JAKE, ANAH, MAYA, RILEY]);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  protected readonly username = computed(() => this.params().get('username') ?? '');

  protected readonly profile = computed<Profile>(() => {
    const name = this.username();
    return (
      this.profiles().find((item) => item.username === name) ?? {
        username: name,
        bio: null,
        image: avatarFor(name || 'reader'),
        following: false,
      }
    );
  });

  protected readonly isSelf = computed(
    () => this.username() === this.auth.currentUser()?.username,
  );

  protected toggleFollow(): void {
    const name = this.username();
    this.profiles.update((list) =>
      list.map((item) =>
        item.username === name ? { ...item, following: !item.following } : item,
      ),
    );
  }
}
