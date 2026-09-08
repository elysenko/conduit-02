import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../core/auth.store';

interface NavItem {
  label: string;
  link: string;
  icon: string;
  exact: boolean;
  queryParams?: Record<string, string>;
}

@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavComponent {
  protected readonly auth = inject(AuthStore);

  protected readonly items = computed<NavItem[]>(() => {
    const user = this.auth.currentUser();
    if (!user) {
      return [
        { label: 'Home', link: '/', icon: '⌂', exact: true },
        { label: 'Sign in', link: '/login', icon: '→', exact: false },
        { label: 'Sign up', link: '/register', icon: '＋', exact: false },
      ];
    }
    return [
      { label: 'Home', link: '/', icon: '⌂', exact: true, queryParams: { tab: 'global' } },
      { label: 'Your Feed', link: '/', icon: '☰', exact: true, queryParams: { tab: 'feed' } },
      { label: 'Write', link: '/editor', icon: '✎', exact: false },
      { label: 'Profile', link: `/profile/${user.username}`, icon: '◍', exact: false },
      { label: 'Settings', link: '/settings', icon: '⚙', exact: false },
    ];
  });
}
