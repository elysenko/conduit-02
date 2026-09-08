import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArticlePreviewComponent } from '../article/article-preview.component';
import { AuthStore } from '../../core/auth.store';
import { MOCK_ARTICLES } from '../../core/mock-data';
import type { Article } from '../../core/models';

@Component({
  selector: 'app-profile-articles',
  imports: [RouterLink, ArticlePreviewComponent],
  templateUrl: './profile-articles.component.html',
  styleUrl: './profile-articles.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileArticlesComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthStore);

  /** Backend-provided data. */
  readonly articles = signal<Article[]>(MOCK_ARTICLES);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private readonly parentParams = toSignal(
    this.route.parent?.paramMap ?? this.route.paramMap,
    { initialValue: this.route.snapshot.parent?.paramMap ?? this.route.snapshot.paramMap },
  );

  protected readonly favoritedOnly = this.route.snapshot.data['favorited'] === true;
  protected readonly username = computed(() => this.parentParams().get('username') ?? '');

  protected readonly visible = computed<Article[]>(() => {
    const name = this.username();
    return this.articles().filter((article) =>
      this.favoritedOnly ? article.favorited : article.author.username === name,
    );
  });

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
