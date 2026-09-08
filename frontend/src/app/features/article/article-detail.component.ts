import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommentListComponent } from './comment-list.component';
import { AuthStore } from '../../core/auth.store';
import { MOCK_ARTICLES } from '../../core/mock-data';
import { formatDate } from '../../core/format';
import { coverFor } from '../../core/avatar';
import type { Article } from '../../core/models';

@Component({
  selector: 'app-article-detail',
  imports: [RouterLink, CommentListComponent],
  templateUrl: './article-detail.component.html',
  styleUrl: './article-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthStore);

  /** Backend-provided data. */
  readonly articles = signal<Article[]>(MOCK_ARTICLES);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  protected readonly formatDate = formatDate;
  protected readonly coverFor = coverFor;

  private readonly slug = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly article = computed<Article | null>(() => {
    const slug = this.slug().get('slug');
    return this.articles().find((item) => item.slug === slug) ?? null;
  });

  protected readonly paragraphs = computed<string[]>(() =>
    (this.article()?.body ?? '').split('\n').filter((line) => line.trim().length > 0),
  );

  protected readonly isAuthor = computed(
    () => this.article()?.author.username === this.auth.currentUser()?.username,
  );

  protected readonly deleteOpen = computed(() => this.query().get('modal') === 'delete-confirm');

  protected setModal(modal: string | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { modal },
      queryParamsHandling: 'merge',
    });
  }

  protected toggleFavorite(): void {
    const current = this.article();
    if (!current) {
      return;
    }
    this.articles.update((list) =>
      list.map((item) =>
        item.slug === current.slug
          ? {
              ...item,
              favorited: !item.favorited,
              favoritesCount: item.favoritesCount + (item.favorited ? -1 : 1),
            }
          : item,
      ),
    );
  }

  protected toggleFollow(): void {
    const current = this.article();
    if (!current) {
      return;
    }
    const username = current.author.username;
    this.articles.update((list) =>
      list.map((item) =>
        item.author.username === username
          ? { ...item, author: { ...item.author, following: !item.author.following } }
          : item,
      ),
    );
  }

  protected confirmDelete(): void {
    const current = this.article();
    if (current) {
      this.articles.update((list) => list.filter((item) => item.slug !== current.slug));
    }
    void this.router.navigate(['/']);
  }
}
