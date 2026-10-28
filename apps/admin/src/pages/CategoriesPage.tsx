import { FormEvent, useState } from 'react';
import {
  useArchiveCategoryMutation,
  useCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
} from '../store/api';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function CategoriesPage() {
  const { data, isLoading, isError } = useCategoriesQuery();
  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: updating }] = useUpdateCategoryMutation();
  const [archiveCategory, { isLoading: archiving }] = useArchiveCategoryMutation();
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    nameEn: '',
    nameHi: '',
    slug: '',
    description: '',
    sortOrder: '0',
    isActive: true,
  });

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    const nameEn = String(fd.get('nameEn') || '').trim();
    const nameHi = String(fd.get('nameHi') || '').trim();
    const slug = String(fd.get('slug') || slugify(nameEn)).trim();
    try {
      await createCategory({
        nameEn,
        nameHi,
        slug,
        description: String(fd.get('description') || '') || undefined,
        sortOrder: Number(fd.get('sortOrder') || 0),
        isActive: fd.get('isActive') === 'on',
      }).unwrap();
      e.currentTarget.reset();
    } catch {
      setError('Could not create category (slug may already exist).');
    }
  }

  function startEdit(cat: {
    id: string;
    nameEn: string;
    nameHi: string;
    slug: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    setEditingId(cat.id);
    setEditForm({
      nameEn: cat.nameEn,
      nameHi: cat.nameHi,
      slug: cat.slug,
      description: cat.description ?? '',
      sortOrder: String(cat.sortOrder ?? 0),
      isActive: cat.isActive !== false,
    });
  }

  async function onSaveEdit() {
    if (!editingId) return;
    setError('');
    try {
      await updateCategory({
        id: editingId,
        body: {
          nameEn: editForm.nameEn,
          nameHi: editForm.nameHi,
          slug: editForm.slug,
          description: editForm.description,
          sortOrder: Number(editForm.sortOrder || 0),
          isActive: editForm.isActive,
        },
      }).unwrap();
      setEditingId(null);
    } catch {
      setError('Could not update category.');
    }
  }

  async function onArchive(id: string) {
    setError('');
    try {
      await archiveCategory(id).unwrap();
    } catch {
      setError('Could not archive category (it may still have active products).');
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Categories</h1>
      <p className="mt-1 text-sm text-muted">Manage product categories used in the catalog.</p>

      <form onSubmit={(e) => void onCreate(e)} className="card mt-6 max-w-xl space-y-3 p-5">
        <h2 className="font-display text-xl text-forest">Add category</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold" htmlFor="nameEn">
              Name (EN)
            </label>
            <input
              id="nameEn"
              name="nameEn"
              required
              minLength={2}
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold" htmlFor="nameHi">
              Name (HI)
            </label>
            <input
              id="nameHi"
              name="nameHi"
              required
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 font-hindi"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold" htmlFor="slug">
              Slug
            </label>
            <input
              id="slug"
              name="slug"
              placeholder="auto from English name if empty"
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold" htmlFor="sortOrder">
              Sort order
            </label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={0}
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input name="isActive" type="checkbox" defaultChecked />
          Active
        </label>
        <button
          type="submit"
          disabled={creating}
          className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-cream disabled:opacity-60"
        >
          {creating ? 'Creating…' : 'Create'}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-spice-red">{error}</p>}
      {isLoading && <p className="mt-6">Loading…</p>}
      {isError && <p className="mt-6 text-spice-red">Could not load categories.</p>}
      {!isLoading && !isError && !(data ?? []).length && (
        <p className="mt-6 text-muted">No categories yet.</p>
      )}

      <div className="mt-6 space-y-3">
        {(data ?? []).map((cat) => (
          <div key={cat.id} className="card p-4">
            {editingId === cat.id ? (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={editForm.nameEn}
                    onChange={(e) => setEditForm((f) => ({ ...f, nameEn: e.target.value }))}
                    className="rounded-xl border border-border bg-white px-3 py-2"
                  />
                  <input
                    value={editForm.nameHi}
                    onChange={(e) => setEditForm((f) => ({ ...f, nameHi: e.target.value }))}
                    className="rounded-xl border border-border bg-white px-3 py-2 font-hindi"
                  />
                  <input
                    value={editForm.slug}
                    onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                    className="rounded-xl border border-border bg-white px-3 py-2"
                  />
                  <input
                    type="number"
                    value={editForm.sortOrder}
                    onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: e.target.value }))}
                    className="rounded-xl border border-border bg-white px-3 py-2"
                  />
                </div>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  Active
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => void onSaveEdit()}
                    className="rounded-full bg-forest px-3 py-1.5 text-sm font-semibold text-cream"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-full border border-border px-3 py-1.5 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-forest">{cat.nameEn}</p>
                  <p className="font-hindi text-sm text-muted">{cat.nameHi}</p>
                  <p className="mt-1 text-xs text-muted">
                    {cat.slug} · sort {cat.sortOrder ?? 0} ·{' '}
                    {cat.isActive === false ? 'inactive' : 'active'}
                    {typeof cat.productCount === 'number' ? ` · ${cat.productCount} products` : ''}
                  </p>
                  {cat.description && <p className="mt-2 text-sm">{cat.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                    onClick={() => startEdit(cat)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={archiving}
                    className="rounded-full border border-spice-red/40 px-3 py-1.5 text-xs font-semibold text-spice-red"
                    onClick={() => void onArchive(cat.id)}
                  >
                    Archive
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
