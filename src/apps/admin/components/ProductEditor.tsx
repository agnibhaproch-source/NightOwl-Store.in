import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Trash2, X } from 'lucide-react';
import { Button, Drawer, Input, PackShot, Select, Switch, Textarea } from '@/shared/ui';
import { useCategories, useProducts } from '@/shared/hooks/live';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { confirmDialog } from '@/shared/store/confirm';
import { readImageAsDataUrl } from '@/shared/lib/files';
import { inr, uid } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { PackShape, Product } from '@/shared/types';
import { useAdminUi } from '../store/ui';

export const SHAPES: PackShape[] = ['noodle', 'cup', 'chips', 'tube', 'biscuit', 'cake', 'bottle', 'can', 'tetra', 'pasta', 'bar', 'box', 'combo'];
const SWATCHES = ['#f5c400', '#e3262f', '#1f5fbf', '#7a2bbd', '#0f9d58', '#ff7a00', '#111111', '#e84393', '#00a8a8', '#8b5a2b'];

export const margin = (p: Pick<Product, 'price' | 'cost'>) => (p.price > 0 ? Math.round(((p.price - p.cost) / p.price) * 100) : 0);

export function blankProduct(categoryId = 'noodles'): Product {
  return {
    id: uid('prd'), name: '', brand: '', categoryId, unit: '', mrp: 0, price: 0, cost: 0, stock: 0, lowStockAt: 5,
    veg: true, active: true, tags: [], popularity: 0, createdAt: Date.now(), color: SWATCHES[0]!, shape: 'chips', description: ''
  };
}

function NumberField({ label, value, onChange, hint, error, min = 0 }: { label: string; value: number; onChange: (n: number) => void; hint?: string; error?: string; min?: number }) {
  return (
    <Input
      label={label}
      type="number"
      inputMode="decimal"
      min={min}
      value={Number.isFinite(value) ? String(value) : ''}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Math.max(min, Number(e.target.value)))}
      hint={hint}
      error={error}
    />
  );
}

/** Add/edit product drawer, mounted once and opened from anywhere via useAdminUi.editProduct(). */
export function ProductEditorHost() {
  const id = useAdminUi((s) => s.productId);
  const close = () => useAdminUi.getState().editProduct(null);
  const [products] = useProducts();
  const [cats] = useCategories();
  const existing = useMemo(() => products.find((p) => p.id === id), [products, id]);
  const [p, setP] = useState<Product>(() => blankProduct());
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const isNew = id === 'new';

  useEffect(() => {
    if (!id) return;
    const base = isNew ? blankProduct(cats.find((c) => c.id !== 'combos')?.id) : existing;
    if (base) {
      setP(base);
      setTags(base.tags.join(', '));
    }
    // Only reset when opening a different product, not on every live update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));
  const errors = {
    name: !p.name.trim() ? 'Required' : undefined,
    price: p.price > p.mrp ? 'Can’t exceed MRP' : p.price <= 0 ? 'Set a price' : undefined,
    cost: p.cost > p.price && p.price > 0 ? 'Cost is above selling price' : undefined
  };
  const m = margin(p);

  const save = async () => {
    setSaving(true);
    try {
      const clean: Product = { ...p, name: p.name.trim(), brand: p.brand.trim(), tags: tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) };
      await services.products.saveProduct(clean);
      toast.success(isNew ? 'Product added' : 'Product saved', clean.name);
      close();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const { ok } = await confirmDialog({ title: `Delete ${p.name}?`, body: 'This removes it from the catalogue. Past orders keep their record.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    await services.products.deleteProduct(p.id);
    toast({ title: 'Product deleted', emoji: '🗑️' });
    close();
  };

  const upload = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast.error('Pick an image file');
    try {
      set('image', await readImageAsDataUrl(f));
    } catch {
      toast.error('Could not read that image');
    }
  };

  const open = !!id && (isNew || !!existing);
  return (
    <Drawer
      open={open}
      onClose={close}
      width="lg"
      title={isNew ? 'New product' : 'Edit product'}
      footer={
        <div className="flex gap-2">
          {!isNew && <Button variant="outline" className="text-pink" icon={<Trash2 className="h-4 w-4" />} onClick={remove}>Delete</Button>}
          <Button block variant="primary" loading={saving} disabled={!!errors.name || !!errors.price} onClick={save}>
            {isNew ? 'Add product' : 'Save changes'}
          </Button>
        </div>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="grid gap-5 md:grid-cols-[200px_1fr]">
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-2xl p-3" style={{ background: `linear-gradient(160deg, ${p.color}33, ${p.color}0d)` }}>
            <PackShot product={{ ...p, name: p.name || 'New item', brand: p.brand || 'Brand' }} />
            {p.image && (
              <button type="button" onClick={() => set('image', undefined)} aria-label="Remove image" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-bg/70">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
          <Button block size="sm" icon={<ImagePlus className="h-4 w-4" />} onClick={() => file.current?.click()}>
            {p.image ? 'Replace photo' : 'Upload photo'}
          </Button>
          {!p.image && (
            <>
              <Select label="Pack art" value={p.shape} onChange={(e) => set('shape', e.target.value as PackShape)}>
                {SHAPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <div>
                <span className="field-label">Brand colour</span>
                <div className="flex flex-wrap gap-1.5">
                  {SWATCHES.map((c) => (
                    <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={p.color === c} onClick={() => set('color', c)} className={cn('h-7 w-7 rounded-full border-2', p.color === c ? 'border-fg' : 'border-transparent')} style={{ background: c }} />
                  ))}
                  <input type="color" aria-label="Custom colour" value={p.color} onChange={(e) => set('color', e.target.value)} className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <Input label="Name" value={p.name} onChange={(e) => set('name', e.target.value)} error={p.name ? undefined : errors.name} placeholder="Maggi 2-Minute Masala" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Brand" value={p.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Nestlé" />
            <Input label="Pack size" value={p.unit} onChange={(e) => set('unit', e.target.value)} placeholder="70 g" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={p.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </Select>
            <div className="flex items-end pb-2"><Switch label="Veg" checked={p.veg} onChange={(v) => set('veg', v)} /></div>
          </div>

          <fieldset className="rounded-2xl border border-line/60 p-3">
            <legend className="px-1 text-[13px] font-semibold">Pricing</legend>
            <div className="grid grid-cols-3 gap-3">
              <NumberField label="Cost (₹)" value={p.cost} onChange={(n) => set('cost', n)} error={errors.cost} />
              <NumberField label="MRP (₹)" value={p.mrp} onChange={(n) => set('mrp', n)} />
              <NumberField label="Selling (₹)" value={p.price} onChange={(n) => set('price', n)} error={p.price ? errors.price : undefined} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
              <span className={cn('rounded-lg px-2 py-1 font-semibold', m >= 15 ? 'bg-lime/15 text-lime' : m > 0 ? 'bg-amber/15 text-amber' : 'bg-pink/15 text-pink')}>
                Margin {m}% · {inr(p.price - p.cost)}/unit
              </span>
              {p.mrp > p.price && <span className="rounded-lg bg-violet/15 px-2 py-1 font-semibold text-violet">{Math.round(((p.mrp - p.price) / p.mrp) * 100)}% off MRP</span>}
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-line/60 p-3">
            <legend className="px-1 text-[13px] font-semibold">Stock</legend>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="In stock" value={p.stock} onChange={(n) => set('stock', Math.round(n))} hint={p.stock === 0 ? 'Shows as out of stock' : undefined} />
              <NumberField label="Low-stock alert at" value={p.lowStockAt} onChange={(n) => set('lowStockAt', Math.round(n))} hint="Shows “Only X left”" />
            </div>
          </fieldset>

          <Textarea label="Description" value={p.description} onChange={(e) => set('description', e.target.value)} rows={2} />
          <Input label="Search tags" value={tags} onChange={(e) => setTags(e.target.value)} hint="Comma separated, e.g. spicy, instant, korean" />
          <Switch label="Visible in the app" description="Hidden products can’t be ordered" checked={p.active} onChange={(v) => set('active', v)} />
        </div>
      </form>
    </Drawer>
  );
}
