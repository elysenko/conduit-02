import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MOCK_ADMIN_SETTINGS } from '../../core/mock-data';
import type { AdminServiceSettings } from '../../core/models';

@Component({
  selector: 'app-admin-settings',
  imports: [FormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSettingsComponent {
  /** Backend-provided data. */
  readonly services = signal<AdminServiceSettings[]>(MOCK_ADMIN_SETTINGS);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  protected readonly savedService = signal<string | null>(null);

  protected readonly unconfigured = computed(() =>
    this.services().filter((service) => !service.configured),
  );

  protected readonly unconfiguredNames = computed(() =>
    this.unconfigured()
      .map((service) => service.service)
      .join(', '),
  );

  protected updateValue(service: string, key: string, value: string): void {
    this.services.update((list) =>
      list.map((item) =>
        item.service === service
          ? { ...item, keys: item.keys.map((entry) => (entry.key === key ? { ...entry, value } : entry)) }
          : item,
      ),
    );
  }

  protected save(service: string): void {
    this.services.update((list) =>
      list.map((item) => {
        if (item.service !== service) {
          return item;
        }
        const keys = item.keys.map((entry) => ({
          ...entry,
          configured: entry.value.trim().length > 0,
        }));
        return { ...item, keys, configured: keys.every((entry) => entry.configured) };
      }),
    );
    this.savedService.set(service);
  }
}
