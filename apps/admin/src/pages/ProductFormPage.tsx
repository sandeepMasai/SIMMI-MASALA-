import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  COMMON_PACK_WEIGHTS_G,
  productCreateSchema,
  type ProductCreateInput,
} from '@simmi/shared';
import { Plus, Trash2 } from 'lucide-react';
import {
  useCategoriesQuery,
  useCreateProductMutation,
  useProductQuery,
  useUpdateProductMutation,
} from '../store/api';

type FormValues = ProductCreateInput;

function emptyVariant(weight: number, prefix = 'SM-NEW'): FormValues['variants'][number] {
  return {
    sku: `${prefix}-${weight}G`,
    packWeightGrams: weight,
    pricePaise: 0,
    compareAtPricePaise: null,
    stockQuantity: 0,
    lowStockThreshold: 5,
    shippingWeightGrams: weight + 20,
    isActive: true,
    barcode: '',
    imageUrl: '',
  };
}

const defaultValues: FormValues = {
  nameEn: '',
  nameHi: '',
  slug: '',
  brandName: 'SIMMI MASALA',
  categoryId: '',
  shortDescription: '',
  description: '',
  images: [],
  isFeatured: false,
  status: 'draft',
  taxRateBps: 0,
  seoTitle: '',
  seoDescription: '',
  isPlaceholderContent: false,
  labelInfo: {
    ingredients: '',
    productType: '',
    countryOfOrigin: 'India',
    netQuantityInfo: '',
    storageInstructions: '',
    shelfLife: '',
    manufacturingDetails: '',
    manufacturerName: '',
    manufacturerAddress: '',
    fssaiLicenseNumber: '',
    fssaiVerified: false,
    batchAndExpiryInfo: '',
    allergenInfo: '',
    usageInstructions: '',
  },
  variants: COMMON_PACK_WEIGHTS_G.map((w) => emptyVariant(w)),
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card space-y-4 p-5">
      <h2 className="font-display text-xl text-forest">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
      {error && <span className="block text-xs text-spice-red">{error}</span>}
    </label>
  );
}

const inputClass = 'w-full rounded-xl border border-border bg-white px-3 py-2.5';

export function ProductFormPage() {
  const { productId } = useParams();
  const isEdit = Boolean(productId);
  const navigate = useNavigate();
  const { data: categories } = useCategoriesQuery();
  const { data: existing, isLoading: loadingProduct } = useProductQuery(productId ?? '', {
    skip: !productId,
  });
  const [createProduct, createState] = useCreateProductMutation();
  const [updateProduct, updateState] = useUpdateProductMutation();
  const [formError, setFormError] = useState('');
  const [dirtyGuard, setDirtyGuard] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(productCreateSchema),
    defaultValues,
    mode: 'onBlur',
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });
  const nameEn = watch('nameEn');
  const saving = createState.isLoading || updateState.isLoading || isSubmitting;

  useEffect(() => {
    if (!existing) return;
    reset({
      nameEn: existing.nameEn,
      nameHi: existing.nameHi,
      slug: existing.slug,
      brandName: existing.brandName ?? 'SIMMI MASALA',
      categoryId: existing.categoryId,
      shortDescription: existing.shortDescription ?? '',
      description: existing.description,
      images: existing.images.map((img) => ({
        url: img.url,
        alt: img.alt ?? '',
        sortOrder: img.sortOrder,
        publicId: img.publicId,
      })),
      isFeatured: existing.isFeatured,
      status: existing.status,
      taxRateBps: existing.taxRateBps,
      seoTitle: existing.seoTitle ?? '',
      seoDescription: existing.seoDescription ?? '',
      isPlaceholderContent: existing.isPlaceholderContent ?? false,
      labelInfo: {
        ingredients: existing.labelInfo?.ingredients ?? '',
        productType: existing.labelInfo?.productType ?? '',
        countryOfOrigin: existing.labelInfo?.countryOfOrigin ?? '',
        netQuantityInfo: existing.labelInfo?.netQuantityInfo ?? '',
        storageInstructions: existing.labelInfo?.storageInstructions ?? '',
        shelfLife: existing.labelInfo?.shelfLife ?? '',
        manufacturingDetails: existing.labelInfo?.manufacturingDetails ?? '',
        manufacturerName: existing.labelInfo?.manufacturerName ?? '',
        manufacturerAddress: existing.labelInfo?.manufacturerAddress ?? '',
        fssaiLicenseNumber: existing.labelInfo?.fssaiLicenseNumber ?? '',
        fssaiVerified: existing.labelInfo?.fssaiVerified ?? false,
        batchAndExpiryInfo: existing.labelInfo?.batchAndExpiryInfo ?? '',
        allergenInfo: existing.labelInfo?.allergenInfo ?? '',
        usageInstructions: existing.labelInfo?.usageInstructions ?? '',
      },
      variants: existing.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        packWeightGrams: v.packWeightGrams,
        pricePaise: v.pricePaise,
        compareAtPricePaise: v.compareAtPricePaise ?? null,
        stockQuantity: v.stockQuantity,
        lowStockThreshold: v.lowStockThreshold,
        shippingWeightGrams: v.shippingWeightGrams,
        isActive: v.isActive,
        barcode: v.barcode ?? '',
        imageUrl: v.imageUrl ?? '',
      })),
    });
  }, [existing, reset]);

  useEffect(() => {
    if (isEdit || !nameEn || form.getValues('slug')) return;
    setValue('slug', slugify(nameEn), { shouldDirty: false });
  }, [nameEn, isEdit, setValue, form]);

  useEffect(() => {
    if (!dirtyGuard || !isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirtyGuard, isDirty]);

  const imageFields = watch('images') ?? [];

  const onSave = async (values: FormValues, statusOverride?: FormValues['status']) => {
    setFormError('');
    const payload: FormValues = {
      ...values,
      status: statusOverride ?? values.status,
      variants: values.variants.map((v) => ({
        ...v,
        shippingWeightGrams: v.shippingWeightGrams ?? v.packWeightGrams + 20,
        compareAtPricePaise: v.compareAtPricePaise || null,
        barcode: v.barcode || '',
        imageUrl: v.imageUrl || '',
      })),
      images: (values.images ?? [])
        .filter((img) => img.url?.trim())
        .map((img, i) => ({
          url: img.url,
          alt: img.alt || values.nameEn,
          sortOrder: img.sortOrder ?? i,
        })),
    };

    const parsed = productCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Validation failed');
      return;
    }

    try {
      if (isEdit && productId) {
        await updateProduct({ id: productId, body: parsed.data }).unwrap();
      } else {
        const created = await createProduct(parsed.data).unwrap();
        setDirtyGuard(false);
        navigate(`/products/${created.id}/edit`, { replace: true });
        return;
      }
      setDirtyGuard(false);
      reset(parsed.data);
      setDirtyGuard(true);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'data' in err
          ? String((err as { data?: { error?: { message?: string } } }).data?.error?.message ?? 'Save failed')
          : err instanceof Error
            ? err.message
            : 'Save failed';
      setFormError(message);
    }
  };

  const categoryOptions = useMemo(() => categories ?? [], [categories]);

  if (isEdit && loadingProduct) return <p className="p-6">Loading product…</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/products" className="text-sm text-muted hover:text-forest">
            ← Products
          </Link>
          <h1 className="font-display text-3xl text-forest">
            {isEdit ? 'Edit product' : 'Add product'}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold"
            onClick={() => void handleSubmit((v) => onSave(v, 'draft'))()}
          >
            Save draft
          </button>
          {isEdit && existing?.slug && (
            <a
              href={`${import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:5173'}/product/${existing.slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              Preview
            </a>
          )}
          <button
            type="button"
            disabled={saving}
            className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-cream"
            onClick={() => void handleSubmit((v) => onSave(v, 'active'))()}
          >
            Publish
          </button>
        </div>
      </div>

      {formError && <p className="rounded-xl bg-discount/10 px-4 py-3 text-sm text-spice-red">{formError}</p>}

      <form className="space-y-4" onSubmit={handleSubmit((v) => onSave(v))}>
        <Section title="1. Basic information">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Product name (English)" error={errors.nameEn?.message}>
              <input className={inputClass} {...register('nameEn')} />
            </Field>
            <Field label="Product name (Hindi)" error={errors.nameHi?.message}>
              <input className={inputClass} {...register('nameHi')} />
            </Field>
            <Field label="Slug" error={errors.slug?.message} hint="Unique URL path, lowercase kebab-case">
              <input className={inputClass} {...register('slug')} />
            </Field>
            <Field label="Brand name" error={errors.brandName?.message}>
              <input className={inputClass} {...register('brandName')} />
            </Field>
            <Field label="Category" error={errors.categoryId?.message}>
              <select className={inputClass} {...register('categoryId')}>
                <option value="">Select category</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameEn} / {c.nameHi}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Featured product">
              <label className="flex items-center gap-2 py-2">
                <input type="checkbox" {...register('isFeatured')} />
                Show on homepage featured areas
              </label>
            </Field>
          </div>
          <Field label="Short description (cards)" error={errors.shortDescription?.message}>
            <textarea rows={2} className={inputClass} {...register('shortDescription')} />
          </Field>
        </Section>

        <Section title="2. Product images">
          <p className="text-xs text-muted">
            Paste image URLs for now. Upload endpoint remains available on an existing product.
            Do not invent packaging claims in alt text.
          </p>
          {(imageFields.length ? imageFields : [{ url: '', alt: '', sortOrder: 0 }]).map((_, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <Field label={`Image URL ${index + 1}`}>
                <input
                  className={inputClass}
                  value={imageFields[index]?.url ?? ''}
                  onChange={(e) => {
                    const next = [...(watch('images') ?? [])];
                    next[index] = { ...(next[index] ?? { sortOrder: index }), url: e.target.value, alt: next[index]?.alt ?? '' };
                    setValue('images', next, { shouldDirty: true });
                  }}
                />
              </Field>
              <Field label="Alt text">
                <input
                  className={inputClass}
                  value={imageFields[index]?.alt ?? ''}
                  onChange={(e) => {
                    const next = [...(watch('images') ?? [])];
                    next[index] = { ...(next[index] ?? { url: '', sortOrder: index }), alt: e.target.value };
                    setValue('images', next, { shouldDirty: true });
                  }}
                />
              </Field>
              <button
                type="button"
                className="mt-7 self-start rounded-full border border-border p-2 text-spice-red"
                onClick={() =>
                  setValue(
                    'images',
                    (watch('images') ?? []).filter((_, i) => i !== index),
                    { shouldDirty: true },
                  )
                }
                aria-label="Remove image"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm"
            onClick={() =>
              setValue('images', [...(watch('images') ?? []), { url: '', alt: '', sortOrder: imageFields.length }], {
                shouldDirty: true,
              })
            }
          >
            <Plus size={14} /> Add image
          </button>
        </Section>

        <Section title="3. Description and details">
          <Field label="Full product description" error={errors.description?.message}>
            <textarea rows={6} className={inputClass} {...register('description')} />
          </Field>
          <Field label="Product type" hint="Optional — e.g. Ground spice powder">
            <input className={inputClass} {...register('labelInfo.productType')} />
          </Field>
          <Field label="Country of origin">
            <input className={inputClass} {...register('labelInfo.countryOfOrigin')} />
          </Field>
          <Field label="Net quantity information">
            <input className={inputClass} {...register('labelInfo.netQuantityInfo')} />
          </Field>
          <Field label="Customer usage instructions">
            <textarea rows={3} className={inputClass} {...register('labelInfo.usageInstructions')} />
          </Field>
        </Section>

        <Section title="4. Ingredients and label information">
          <p className="rounded-xl bg-gold/15 px-3 py-2 text-xs text-ink">
            Leave fields blank until verified. Do not invent FSSAI numbers, shelf life, or manufacturing claims.
          </p>
          <Field label="Ingredients">
            <textarea rows={3} className={inputClass} {...register('labelInfo.ingredients')} />
          </Field>
          <Field label="Storage instructions">
            <textarea rows={2} className={inputClass} {...register('labelInfo.storageInstructions')} />
          </Field>
          <Field label="Shelf life">
            <input className={inputClass} {...register('labelInfo.shelfLife')} />
          </Field>
          <Field label="Manufacturing / packing details">
            <textarea rows={2} className={inputClass} {...register('labelInfo.manufacturingDetails')} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Manufacturer / packer name">
              <input className={inputClass} {...register('labelInfo.manufacturerName')} />
            </Field>
            <Field label="Manufacturer / packer address">
              <textarea rows={2} className={inputClass} {...register('labelInfo.manufacturerAddress')} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="FSSAI license number" hint="Only enter when verified">
              <input className={inputClass} {...register('labelInfo.fssaiLicenseNumber')} />
            </Field>
            <Field label="FSSAI verified">
              <label className="flex items-center gap-2 py-2">
                <input type="checkbox" {...register('labelInfo.fssaiVerified')} />
                Confirmed against business documentation
              </label>
            </Field>
          </div>
          <Field label="Batch / expiry details">
            <textarea rows={2} className={inputClass} {...register('labelInfo.batchAndExpiryInfo')} />
          </Field>
          <Field label="Allergen information">
            <textarea rows={2} className={inputClass} {...register('labelInfo.allergenInfo')} />
          </Field>
        </Section>

        <Section title="5. Pack variants and pricing">
          <p className="text-xs text-muted">Prices are in paise (₹1 = 100 paise). Pack sizes must be unique per product.</p>
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-2xl border border-border bg-cream/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold text-forest">Variant {index + 1}</p>
                  {fields.length > 1 && (
                    <button type="button" className="text-spice-red" onClick={() => remove(index)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <input type="hidden" {...register(`variants.${index}.id`)} />
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="SKU" error={errors.variants?.[index]?.sku?.message}>
                    <input className={inputClass} {...register(`variants.${index}.sku`)} />
                  </Field>
                  <Field label="Weight (g)" error={errors.variants?.[index]?.packWeightGrams?.message}>
                    <input
                      type="number"
                      className={inputClass}
                      {...register(`variants.${index}.packWeightGrams`, { valueAsNumber: true })}
                    />
                  </Field>
                  <Field label="Selling price (paise)" error={errors.variants?.[index]?.pricePaise?.message}>
                    <input
                      type="number"
                      className={inputClass}
                      {...register(`variants.${index}.pricePaise`, { valueAsNumber: true })}
                    />
                  </Field>
                  <Field label="Compare-at price (paise)">
                    <input
                      type="number"
                      className={inputClass}
                      {...register(`variants.${index}.compareAtPricePaise`, {
                        setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
                      })}
                    />
                  </Field>
                  <Field label="Barcode (optional)">
                    <input className={inputClass} {...register(`variants.${index}.barcode`)} />
                  </Field>
                  <Field label="Variant image URL">
                    <input className={inputClass} {...register(`variants.${index}.imageUrl`)} />
                  </Field>
                  <Field label="Active">
                    <label className="flex items-center gap-2 py-2">
                      <input type="checkbox" {...register(`variants.${index}.isActive`)} />
                      Sell this pack
                    </label>
                  </Field>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm"
            onClick={() => append(emptyVariant(1000, slugify(watch('slug') || 'SM-NEW').toUpperCase() || 'SM-NEW'))}
          >
            <Plus size={14} /> Add pack size
          </button>
        </Section>

        <Section title="6. Inventory">
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 md:grid-cols-3">
                <p className="md:col-span-3 text-sm font-medium text-forest">
                  {watch(`variants.${index}.sku`) || `Variant ${index + 1}`}
                </p>
                <Field label="Stock quantity">
                  <input
                    type="number"
                    className={inputClass}
                    {...register(`variants.${index}.stockQuantity`, { valueAsNumber: true })}
                  />
                </Field>
                <Field label="Low-stock threshold">
                  <input
                    type="number"
                    className={inputClass}
                    {...register(`variants.${index}.lowStockThreshold`, { valueAsNumber: true })}
                  />
                </Field>
                <Field label="Shipping weight (g)">
                  <input
                    type="number"
                    className={inputClass}
                    {...register(`variants.${index}.shippingWeightGrams`, { valueAsNumber: true })}
                  />
                </Field>
              </div>
            ))}
          </div>
        </Section>

        <Section title="7. SEO">
          <Field label="SEO title">
            <input className={inputClass} {...register('seoTitle')} />
          </Field>
          <Field label="SEO meta description">
            <textarea rows={3} className={inputClass} {...register('seoDescription')} />
          </Field>
        </Section>

        <Section title="8. Publishing status">
          <Field label="Status">
            <select className={inputClass} {...register('status')}>
              <option value="draft">Draft</option>
              <option value="active">Active (published)</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Placeholder content flag">
            <label className="flex items-center gap-2 py-2">
              <input type="checkbox" {...register('isPlaceholderContent')} />
              Mark catalogue copy/pricing as placeholder pending approval
            </label>
          </Field>
          <button type="submit" disabled={saving} className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-forest-dark disabled:opacity-60">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </Section>
      </form>
    </div>
  );
}
