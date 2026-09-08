import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth.store';
import { MOCK_COMMENTS } from '../../core/mock-data';
import { avatarFor } from '../../core/avatar';
import { formatDate } from '../../core/format';
import type { Comment } from '../../core/models';

@Component({
  selector: 'app-comment-list',
  imports: [FormsModule, RouterLink],
  templateUrl: './comment-list.component.html',
  styleUrl: './comment-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthStore);

  readonly slug = input.required<string>();

  /** Backend-provided data. */
  readonly comments = signal<Comment[]>(MOCK_COMMENTS);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  protected readonly draft = signal('');
  protected readonly formatDate = formatDate;

  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly pendingDeleteId = computed<number | null>(() => {
    if (this.query().get('modal') !== 'delete-comment') {
      return null;
    }
    const raw = Number(this.query().get('commentId'));
    return Number.isFinite(raw) ? raw : null;
  });

  protected readonly pendingDelete = computed<Comment | null>(() => {
    const id = this.pendingDeleteId();
    return id === null ? null : (this.comments().find((item) => item.id === id) ?? null);
  });

  protected isAuthor(comment: Comment): boolean {
    return comment.author.username === this.auth.currentUser()?.username;
  }

  protected requestDelete(comment: Comment): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { modal: 'delete-comment', commentId: comment.id },
      queryParamsHandling: 'merge',
    });
  }

  protected dismissDelete(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { modal: null, commentId: null },
      queryParamsHandling: 'merge',
    });
  }

  protected confirmDelete(): void {
    const id = this.pendingDeleteId();
    if (id !== null) {
      this.comments.update((list) => list.filter((item) => item.id !== id));
    }
    this.dismissDelete();
  }

  protected post(): void {
    const body = this.draft().trim();
    const user = this.auth.currentUser();
    if (!body || !user) {
      return;
    }
    const now = new Date().toISOString();
    const nextId = this.comments().reduce((max, item) => Math.max(max, item.id), 0) + 1;
    this.comments.update((list) => [
      ...list,
      {
        id: nextId,
        body,
        createdAt: now,
        updatedAt: now,
        author: {
          username: user.username,
          bio: user.bio,
          image: user.image ?? avatarFor(user.username),
          following: false,
        },
      },
    ]);
    this.draft.set('');
  }
}
