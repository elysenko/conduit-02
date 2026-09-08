import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatDate } from '../../core/format';
import type { Article } from '../../core/models';

@Component({
  selector: 'app-article-preview',
  imports: [RouterLink],
  templateUrl: './article-preview.component.html',
  styleUrl: './article-preview.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticlePreviewComponent {
  readonly article = input.required<Article>();
  readonly canFavorite = input(false);
  readonly favoriteToggled = output<Article>();

  protected readonly formatDate = formatDate;
}
