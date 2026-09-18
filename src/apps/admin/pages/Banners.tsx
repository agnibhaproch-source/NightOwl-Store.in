import { useEffect, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { ArrowRight, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useBanners, useCategories } from '@/shared/hooks/live';
import { Button, EmptyState, IconButton, Input, Select, Sheet, Switch, toneVar } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { confirmDialog } from '@/shared/store/confirm';
import { uid } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { Banner, Tone } from '@/shared/types';
import { PageTitle, Panel } from '../components/Layout';

const TONES: Tone[] = ['violet', 'cyan', 'lime', 'pink', 'amber'];

function Preview({ b }: { b: Banner }) {
  return (
    <div
      className="flex h-[132px] items-center gap-3 overflow-hidden rounded-2xl border border-line/60 p-4"
      style={{ background: `linear-gradient(120deg, rgb(${toneVar[b.tone]} / .28), rgb(${toneVar[b.tone]} / .06) 70%)` }}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[22px] font-extrabold leading-none">{b.title || 'Banner title'}</p>
        <p className="mt-1 line-clamp-2 text-[13px] text-fg/75">{b.subtitle || 'Short supporting line'}</p>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-fg px-2.5 py-1 text-[12px] font-bold text-bg">{b.cta || 'Shop now'} <ArrowRight className="h-3 w-3" /></span>
      </div>
      <span className="text-[64px] leading-none">{b.emoji}</span>
    </div>
  );
}

function Row({ b, onEdit, onDelete, onDrop }: { b: Banner; onEdit: () => void; onDelete: () => void; onDrop: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={b} dragListener={false} dragControls={controls} onDragEnd={onDrop} className="relative flex items-center gap-2 rounded-3xl bg-bg" whileDrag={{ scale: 1.02, zIndex: 10 }}>
      <button onPointerDown={(e) => controls.start(e)} aria-label={`Drag to reorder ${b.title}`} className="grid h-12 w-8 shrink-0 cursor-grab touch-none place-items-center text-muted">
        <GripVertical className="h-5 w-5" />
      </button>
      <div className={cn('min-w-0 flex-1', !b.active && 'opacity-50')}><Preview b={b} /></div>
      <div className="flex shrink-0 flex-col items-center gap-1">
        <Switch label={`Show ${b.title}`} hideLabel checked={b.active} onChange={(v) => services.banners.saveBanner({ ...b, active: v })} />
        <IconButton label={`Edit ${b.title}`} onClick={onEdit}><Pencil className="h-4 w-4" /></IconButton>
        <IconButton label={`Delete ${b.title}`} onClick={onDelete}><Trash2 className="h-4 w-4 text-pink" /></IconButton>
      </div>
    </Reorder.Item>
  );
}

export default function Banners() {
  const [banners] = useBanners();
  const [cats] = useCategories();
  const [items, setItems] = useState<Banner[]>([]);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => setItems(banners), [banners]);

  const links = [
    { v: '/', l: 'Home' },
    { v: '/search', l: 'All products' },
    { v: '/search?max=50', l: 'Under ₹50' },
    { v: '/search?sort=new', l: 'New arrivals' },
    ...cats.map((c) => ({ v: `/c/${c.id}`, l: `${c.emoji} ${c.name}` }))
  ];

  const persist = async () => {
    const ids = items.map((b) => b.id);
    if (ids.join() !== banners.map((b) => b.id).join()) {
      await services.banners.reorderBanners(ids);
      toast({ title: 'Banner order saved', emoji: '↕️', duration: 1800 });
    }
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (!editing.title.trim()) throw new Error('Add a title');
      await services.banners.saveBanner({ ...editing, title: editing.title.trim() });
      toast.success('Banner saved');
      setEditing(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageTitle
        title="Home banners"
        sub="The rotating carousel on the customer home screen. Drag to reorder."
        actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ id: uid('bn'), title: '', subtitle: '', cta: 'Shop now', link: '/', tone: 'violet', emoji: '🌙', active: true, order: banners.length })}>New banner</Button>}
      />
      {!banners.length ? (
        <EmptyState emoji="🖼️" title="No banners" />
      ) : (
        <Panel className="max-w-3xl">
          <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-3">
            {items.map((b) => (
              <Row
                key={b.id}
                b={b}
                onDrop={persist}
                onEdit={() => setEditing({ ...b })}
                onDelete={async () => {
                  const { ok } = await confirmDialog({ title: `Delete “${b.title}”?`, confirmLabel: 'Delete', tone: 'danger' });
                  if (ok) await services.banners.deleteBanner(b.id);
                }}
              />
            ))}
          </Reorder.Group>
        </Panel>
      )}
      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing && banners.some((b) => b.id === editing.id) ? 'Edit banner' : 'New banner'}
        size="lg"
        footer={<Button block variant="primary" loading={saving} onClick={save}>Save banner</Button>}
      >
        {editing && (
          <div className="space-y-4">
            <Preview b={editing} />
            <div className="grid gap-3 sm:grid-cols-[1fr_96px]">
              <Input label="Title" value={editing.title} maxLength={28} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              <Input label="Emoji" value={editing.emoji} maxLength={4} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} />
            </div>
            <Input label="Subtitle" value={editing.subtitle} maxLength={70} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Button text" value={editing.cta} maxLength={18} onChange={(e) => setEditing({ ...editing, cta: e.target.value })} />
              <Select label="Opens" value={editing.link} onChange={(e) => setEditing({ ...editing, link: e.target.value })}>
                {links.map((l) => <option key={l.v} value={l.v}>{l.l}</option>)}
              </Select>
            </div>
            <fieldset>
              <legend className="field-label">Colour</legend>
              <div className="flex gap-2">
                {TONES.map((t) => (
                  <button key={t} type="button" aria-label={t} aria-pressed={editing.tone === t} onClick={() => setEditing({ ...editing, tone: t })} className={cn('h-10 w-10 rounded-full border-2', editing.tone === t ? 'border-fg' : 'border-transparent')} style={{ background: `rgb(var(--${t}))` }} />
                ))}
              </div>
            </fieldset>
            <Switch label="Show on home" checked={editing.active} onChange={(v) => setEditing({ ...editing, active: v })} />
          </div>
        )}
      </Sheet>
    </>
  );
}
