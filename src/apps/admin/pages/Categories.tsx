import { useEffect, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCategories, useProducts } from '@/shared/hooks/live';
import { Button, IconButton, Input, Sheet, Switch, toneSoft } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { confirmDialog } from '@/shared/store/confirm';
import { cn } from '@/shared/lib/cn';
import { slug } from '@/shared/lib/format';
import type { Category, Tone } from '@/shared/types';
import { PageTitle, Panel } from '../components/Layout';

const TONES: Tone[] = ['violet', 'cyan', 'lime', 'pink', 'amber'];
const EMOJIS = ['🍜', '🥔', '🍪', '🧁', '🥤', '🍝', '🍫', '🎁', '🍿', '🧃', '🥜', '🍦', '☕', '🧂', '🍬', '🥫'];

function Row({ c, count, onEdit, onDelete, onDrop }: { c: Category; count: number; onEdit: () => void; onDelete: () => void; onDrop: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={c}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      className="flex items-center gap-3 border-b border-line/40 bg-surface px-3 py-2.5 last:border-0"
      whileDrag={{ scale: 1.02, boxShadow: '0 20px 40px -20px rgba(0,0,0,.5)', zIndex: 10 }}
    >
      <button
        onPointerDown={(e) => controls.start(e)}
        aria-label={`Drag to reorder ${c.name}`}
        className="grid h-10 w-8 cursor-grab touch-none place-items-center text-muted active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl', toneSoft[c.tone])}>{c.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{c.name}</p>
        <p className="text-[12px] text-muted">{count} product{count === 1 ? '' : 's'}{c.active ? '' : ' · hidden'}</p>
      </div>
      <Switch label={`Show ${c.name}`} hideLabel checked={c.active} onChange={(v) => services.products.saveCategory({ ...c, active: v })} />
      <IconButton label={`Edit ${c.name}`} onClick={onEdit}><Pencil className="h-4 w-4" /></IconButton>
      <IconButton label={`Delete ${c.name}`} onClick={onDelete}><Trash2 className="h-4 w-4 text-pink" /></IconButton>
    </Reorder.Item>
  );
}

export default function Categories() {
  const [cats] = useCategories();
  const [products] = useProducts();
  const [items, setItems] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setItems(cats), [cats]);
  const count = (id: string) => products.filter((p) => p.categoryId === id).length;
  const isNew = editing && !cats.some((c) => c.id === editing.id);

  const persistOrder = async () => {
    const ids = items.map((c) => c.id);
    if (ids.join() === cats.map((c) => c.id).join()) return;
    await services.products.reorderCategories(ids);
    toast({ title: 'Order saved', body: 'The app now shows categories in this order.', emoji: '↕️', duration: 2000 });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const c = { ...editing, name: editing.name.trim(), id: isNew ? slug(editing.name) || editing.id : editing.id };
      if (isNew && cats.some((x) => x.id === c.id)) throw new Error('A category with this name already exists');
      await services.products.saveCategory(c);
      toast.success(isNew ? 'Category added' : 'Category saved');
      setEditing(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Category) => {
    const n = count(c.id);
    if (n) {
      toast.error(`${c.name} still has ${n} products`, 'Move or delete them first, or just hide the category.');
      return;
    }
    const { ok } = await confirmDialog({ title: `Delete ${c.name}?`, confirmLabel: 'Delete', tone: 'danger' });
    if (ok) await services.products.deleteCategory(c.id);
  };

  return (
    <>
      <PageTitle
        title="Categories"
        sub="Drag to reorder. The order here is the order on the home screen."
        actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ id: `cat-${Date.now()}`, name: '', emoji: '🍿', tone: 'violet', order: cats.length, active: true })}>Add category</Button>}
      />
      <Panel flush className="max-w-2xl overflow-hidden">
        <Reorder.Group axis="y" values={items} onReorder={setItems} className="relative">
          {items.map((c) => (
            <Row key={c.id} c={c} count={count(c.id)} onEdit={() => setEditing(c)} onDelete={() => remove(c)} onDrop={persistOrder} />
          ))}
        </Reorder.Group>
      </Panel>

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={isNew ? 'New category' : 'Edit category'}
        footer={<Button block variant="primary" loading={saving} disabled={!editing?.name.trim()} onClick={save}>{isNew ? 'Add category' : 'Save'}</Button>}
      >
        {editing && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <span className={cn('grid h-20 w-20 place-items-center rounded-3xl text-5xl', toneSoft[editing.tone])}>{editing.emoji}</span>
              <Input label="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus placeholder="Ice cream" className="flex-1" />
            </div>
            <fieldset>
              <legend className="field-label">Icon</legend>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map((e) => (
                  <button key={e} type="button" aria-pressed={editing.emoji === e} onClick={() => setEditing({ ...editing, emoji: e })} className={cn('grid h-11 w-11 place-items-center rounded-xl border text-2xl', editing.emoji === e ? 'border-violet bg-violet/10' : 'border-line')}>
                    {e}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="field-label">Colour</legend>
              <div className="flex gap-2">
                {TONES.map((t) => (
                  <button key={t} type="button" aria-label={t} aria-pressed={editing.tone === t} onClick={() => setEditing({ ...editing, tone: t })} className={cn('h-10 w-10 rounded-full border-2', editing.tone === t ? 'border-fg' : 'border-transparent')} style={{ background: `rgb(var(--${t}))` }} />
                ))}
              </div>
            </fieldset>
            <Switch label="Visible in the app" checked={editing.active} onChange={(v) => setEditing({ ...editing, active: v })} />
          </div>
        )}
      </Sheet>
    </>
  );
}
