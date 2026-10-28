import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useContentQuery, useUpsertContentMutation } from '../store/api';

const EDITABLE_KEYS = ['home.hero', 'about'] as const;

type EditableKey = (typeof EDITABLE_KEYS)[number];

type ContentForm = {
  title: string;
  status: 'draft' | 'published';
  heading: string;
  tagline: string;
  imageUrl: string;
  body: string;
};

const emptyForm: ContentForm = {
  title: '',
  status: 'draft',
  heading: '',
  tagline: '',
  imageUrl: '',
  body: '',
};

function blocksToForm(blocks: Record<string, unknown> | undefined): Pick<
  ContentForm,
  'heading' | 'tagline' | 'imageUrl' | 'body'
> {
  return {
    heading: String(blocks?.heading ?? ''),
    tagline: String(blocks?.tagline ?? ''),
    imageUrl: String(blocks?.imageUrl ?? ''),
    body: String(blocks?.body ?? ''),
  };
}

export function ContentPage() {
  const { data, isLoading, isError } = useContentQuery();
  const [upsert, { isLoading: saving }] = useUpsertContentMutation();
  const [selectedKey, setSelectedKey] = useState<EditableKey>('home.hero');
  const [form, setForm] = useState<ContentForm>(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const byKey = useMemo(() => {
    const map = new Map((data ?? []).map((d) => [d.key, d]));
    return map;
  }, [data]);

  useEffect(() => {
    const doc = byKey.get(selectedKey);
    if (doc) {
      setForm({
        title: doc.title,
        status: doc.status,
        ...blocksToForm(doc.blocks),
      });
    } else {
      setForm({
        ...emptyForm,
        title: selectedKey === 'home.hero' ? 'Home hero' : 'About',
      });
    }
    setMessage('');
    setError('');
  }, [selectedKey, byKey]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await upsert({
        key: selectedKey,
        title: form.title.trim(),
        status: form.status,
        blocks: {
          heading: form.heading,
          tagline: form.tagline,
          imageUrl: form.imageUrl,
          body: form.body,
        },
      }).unwrap();
      setMessage(`Saved ${selectedKey} as ${form.status}.`);
    } catch {
      setError('Could not save content.');
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Content</h1>
      <p className="mt-1 text-sm text-muted">Edit storefront content blocks (draft or published).</p>

      {isLoading && <p className="mt-6">Loading…</p>}
      {isError && <p className="mt-6 text-spice-red">Could not load content.</p>}

      <div className="mt-6 flex flex-wrap gap-2">
        {EDITABLE_KEYS.map((key) => {
          const existing = byKey.get(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedKey(key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                selectedKey === key
                  ? 'bg-forest text-cream'
                  : 'border border-border bg-white text-forest'
              }`}
            >
              {key}
              {existing ? ` · ${existing.status}` : ' · new'}
            </button>
          );
        })}
      </div>

      <form onSubmit={(e) => void onSave(e)} className="card mt-6 max-w-2xl space-y-3 p-5">
        <h2 className="font-display text-xl text-forest">{selectedKey}</h2>
        <div>
          <label className="block text-sm font-semibold" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            minLength={2}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({ ...f, status: e.target.value as 'draft' | 'published' }))
            }
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="heading">
            Heading
          </label>
          <input
            id="heading"
            value={form.heading}
            onChange={(e) => setForm((f) => ({ ...f, heading: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="tagline">
            Tagline
          </label>
          <input
            id="tagline"
            value={form.tagline}
            onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="imageUrl">
            Image URL
          </label>
          <input
            id="imageUrl"
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="body">
            Body
          </label>
          <textarea
            id="body"
            rows={6}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </div>
        {error && <p className="text-sm text-spice-red">{error}</p>}
        {message && <p className="text-sm text-forest">{message}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-cream disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save content'}
        </button>
      </form>

      {(data ?? []).length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-xl text-forest">All content keys</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(data ?? []).map((d) => (
              <li key={d.id} className="rounded-xl border border-border bg-white px-3 py-2">
                <strong>{d.key}</strong> · {d.title} · {d.status}
                {d.updatedAt ? ` · updated ${new Date(d.updatedAt).toLocaleString()}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
