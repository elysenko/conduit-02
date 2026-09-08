import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MOCK_ARTICLES } from '../../core/mock-data';
import type { Article } from '../../core/models';

@Component({
  selector: 'app-editor',
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Backend-provided data. */
  readonly articles = signal<Article[]>(MOCK_ARTICLES);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  protected readonly slug = signal<string | null>(this.route.snapshot.paramMap.get('slug'));
  protected readonly isEdit = computed(() => this.slug() !== null);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    description: ['', [Validators.required]],
    body: ['', [Validators.required]],
  });

  protected readonly tags = signal<string[]>([]);
  protected readonly tagDraft = signal('');
  protected readonly errors = signal<string[]>([]);
  protected readonly submitting = signal(false);

  constructor() {
    const existing = this.articles().find((item) => item.slug === this.slug());
    if (existing) {
      this.form.setValue({
        title: existing.title,
        description: existing.description,
        body: existing.body,
      });
      this.tags.set([...existing.tagList]);
    }
  }

  protected addTag(): void {
    const tag = this.tagDraft().trim().toLowerCase();
    if (tag && !this.tags().includes(tag)) {
      this.tags.update((list) => [...list, tag]);
    }
    this.tagDraft.set('');
  }

  protected removeTag(tag: string): void {
    this.tags.update((list) => list.filter((item) => item !== tag));
  }

  protected submit(): void {
    const { title, description, body } = this.form.getRawValue();
    const problems: string[] = [];
    if (!title.trim()) {
      problems.push("title can't be blank");
    }
    if (!description.trim()) {
      problems.push("description can't be blank");
    }
    if (!body.trim()) {
      problems.push("body can't be blank");
    }
    if (problems.length > 0) {
      this.errors.set(problems);
      return;
    }

    this.errors.set([]);
    this.submitting.set(true);
    // Slug is generated on create and immutable across edits, so links survive retitling.
    const targetSlug = this.slug() ?? `${slugify(title)}-${suffix(title)}`;
    this.submitting.set(false);
    void this.router.navigate(['/article', targetSlug]);
  }

  protected cancel(): void {
    const current = this.slug();
    void this.router.navigate(current ? ['/article', current] : ['/']);
  }
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'article'
  );
}

function suffix(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33 + seed.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36).padStart(6, '0').slice(0, 6);
}
