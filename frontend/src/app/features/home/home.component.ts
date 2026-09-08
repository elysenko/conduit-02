import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArticlePreviewComponent } from '../article/article-preview.component';
import { AuthStore } from '../../core/auth.store';
import { MOCK_ARTICLES, MOCK_TAGS } from '../../core/mock-data';
import type { Article } from '../../core/models';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-home',
  imports: [RouterLink, ArticlePreviewComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthStore);

  /** Backend-provided data. */
  readonly articles = signal<Article[]>(MOCK_ARTICLES);
  readonly tags = signal<string[]>(MOCK_TAGS);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly activeTab = computed(() =>
    this.params().get('tab') === 'feed' && this.auth.isAuthenticated() ? 'feed' : 'global',
  );
  protected readonly activeTag = computed(() => this.params().get('tag') ?? '');
  protected readonly page = computed(() => {
    const raw = Number(this.params().get('page') ?? '1');
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
  });

  protected readonly filtered = computed<Article[]>(() => {
    const tag = this.activeTag();
    const feedOnly = this.activeTab() === 'feed';
    return this.articles().filter(
      (article) =>
        (!tag || article.tagList.includes(tag)) && (!feedOnly || article.author.following),
    );
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)),
  );

  protected readonly pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_unused, index) => index + 1),
  );

  protected readonly visible = computed<Article[]>(() => {
    const start = (Math.min(this.page(), this.totalPages()) - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  protected selectTab(tab: 'global' | 'feed'): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab, tag: null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected selectTag(tag: string | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tag, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page === 1 ? null : page },
      queryParamsHandling: 'merge',
    });
  }

  protected toggleFavorite(target: Article): void {
    this.articles.update((list) =>
      list.map((article) =>
        article.slug === target.slug
          ? {
              ...article,
              favorited: !article.favorited,
              favoritesCount: article.favoritesCount + (article.favorited ? -1 : 1),
            }
          : article,
      ),
    );
  }
}
