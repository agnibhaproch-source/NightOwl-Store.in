import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, TrendingUp } from 'lucide-react';
import { useCategories, useOrders, useProducts } from '@/shared/hooks/live';
import { Button, EmptyState, Segmented } from '@/shared/ui';
import { DAY, latestNight } from '@/shared/lib/time';
import { fmtDate, inr, toDateInput } from '@/shared/lib/format';
import { toCSV, downloadFile } from '@/shared/lib/files';
import { useSettings } from '@/shared/hooks/live';
import type { Order } from '@/shared/types';
import { PageTitle, Panel } from '../components/Layout';
import { Kpi, tooltipStyle, useChartColors } from '../components/charts';

type Preset = '7' | '14' | '30' | 'custom';

export default function Reports() {
  const [orders] = useOrders();
  const [products] = useProducts();
  const [cats] = useCategories();
  const [settings] = useSettings();
  const c = useChartColors();
  const tip = tooltipStyle(c);
  const [preset, setPreset] = useState<Preset>('7');
  const [from, setFrom] = useState(toDateInput(Date.now() - 7 * DAY));
  const [to, setTo] = useState(toDateInput(Date.now()));

  const range = useMemo(() => {
    const [nightStart, nightEnd] = latestNight(Date.now(), settings);
    if (preset === 'custom') {
      const a = new Date(`${from}T12:00:00`).getTime();
      const b = new Date(`${to}T12:00:00`).getTime() + DAY;
      return [Math.min(a, b), Math.max(a, b)] as const;
    }
    const days = Number(preset);
    return [nightStart - (days - 1) * DAY, nightEnd] as const;
  }, [preset, from, to, settings]);

  const data = useMemo(() => {
    const inR = (o: Order) => o.createdAt >= range[0] && o.createdAt < range[1];
    const all = orders.filter(inR);
    const ok = all.filter((o) => o.status !== 'cancelled');
    const revenue = ok.reduce((a, o) => a + o.bill.grandTotal, 0);
    const itemRevenue = ok.reduce((a, o) => a + o.bill.itemTotal, 0);
    const byId = new Map(products.map((p) => [p.id, p]));
    const cogs = ok.reduce((a, o) => a + o.items.reduce((s, i) => s + (byId.get(i.productId)?.cost ?? i.price * 0.75) * i.qty, 0), 0);
    const fees = ok.reduce((a, o) => a + o.bill.deliveryFee + o.bill.convenienceFee, 0);
    const discounts = ok.reduce((a, o) => a + o.bill.couponDiscount, 0);
    const units = ok.reduce((a, o) => a + o.items.reduce((s, i) => s + i.qty, 0), 0);

    const nights: { night: string; orders: number; revenue: number; cancelled: number }[] = [];
    for (let t = range[0]; t < range[1]; t += DAY) {
      const list = all.filter((o) => o.createdAt >= t && o.createdAt < t + DAY);
      nights.push({
        night: fmtDate(t),
        orders: list.filter((o) => o.status !== 'cancelled').length,
        cancelled: list.filter((o) => o.status === 'cancelled').length,
        revenue: list.filter((o) => o.status !== 'cancelled').reduce((a, o) => a + o.bill.grandTotal, 0)
      });
    }

    const prod = new Map<string, { name: string; qty: number; revenue: number; cost: number }>();
    const catMap = new Map<string, { qty: number; revenue: number }>();
    ok.forEach((o) =>
      o.items.forEach((i) => {
        const p = byId.get(i.productId);
        const cur = prod.get(i.productId) ?? { name: i.name, qty: 0, revenue: 0, cost: 0 };
        cur.qty += i.qty;
        cur.revenue += i.price * i.qty;
        cur.cost += (p?.cost ?? i.price * 0.75) * i.qty;
        prod.set(i.productId, cur);
        const cid = p?.categoryId ?? 'other';
        const cc = catMap.get(cid) ?? { qty: 0, revenue: 0 };
        cc.qty += i.qty;
        cc.revenue += i.price * i.qty;
        catMap.set(cid, cc);
      })
    );
    const hostels = settings.hostels.map((h) => ({
      short: h.short,
      orders: ok.filter((o) => o.address.hostelId === h.id).length,
      revenue: ok.filter((o) => o.address.hostelId === h.id).reduce((a, o) => a + o.bill.grandTotal, 0)
    }));

    return {
      all, ok, revenue, itemRevenue, cogs, fees, discounts, units, nights, hostels,
      products: [...prod.entries()].map(([id, v]) => ({ id, ...v, profit: v.revenue - v.cost })).sort((a, b) => b.revenue - a.revenue),
      cats: [...catMap.entries()].map(([id, v]) => ({ id, name: cats.find((x) => x.id === id)?.name ?? 'Other', ...v })).sort((a, b) => b.revenue - a.revenue)
    };
  }, [orders, products, cats, settings, range]);

  const grossProfit = data.itemRevenue - data.cogs - data.discounts;

  const exportOrders = () =>
    downloadFile(
      `nightowl-orders-${from}-to-${to}.csv`,
      toCSV(data.all.map((o) => ({
        order_id: o.id, placed_at: new Date(o.createdAt).toISOString(), status: o.status, customer: o.customerName, phone: o.phone,
        hostel: settings.hostels.find((h) => h.id === o.address.hostelId)?.short ?? '', block: o.address.block, room: o.address.room,
        units: o.items.reduce((a, i) => a + i.qty, 0), item_total: o.bill.itemTotal, coupon: o.bill.couponCode ?? '',
        coupon_discount: o.bill.couponDiscount, delivery_fee: o.bill.deliveryFee, convenience_fee: o.bill.convenienceFee,
        grand_total: o.bill.grandTotal, rating: o.rating?.order ?? ''
      }))),
      'text/csv'
    );

  const exportItems = () =>
    downloadFile(
      `nightowl-items-${from}-to-${to}.csv`,
      toCSV(data.products.map((p) => ({ product_id: p.id, name: p.name, units_sold: p.qty, revenue: p.revenue, cost: Math.round(p.cost), gross_profit: Math.round(p.profit) }))),
      'text/csv'
    );

  return (
    <>
      <PageTitle
        title="Sales reports"
        sub={`${fmtDate(range[0])} → ${fmtDate(range[1] - DAY)} · ${data.ok.length} orders`}
        actions={
          <>
            <Button icon={<Download className="h-4 w-4" />} onClick={exportOrders}>Orders CSV</Button>
            <Button icon={<Download className="h-4 w-4" />} onClick={exportItems}>Items CSV</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <Segmented
          label="Date range"
          value={preset}
          onChange={setPreset}
          options={[
            { value: '7', label: '7 nights' },
            { value: '14', label: '14 nights' },
            { value: '30', label: '30 nights' },
            { value: 'custom', label: 'Custom' }
          ]}
        />
        {preset === 'custom' && (
          <>
            <label className="block"><span className="field-label">From</span><input type="date" className="field w-40" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="block"><span className="field-label">To</span><input type="date" className="field w-40" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          </>
        )}
      </div>

      {!data.all.length ? (
        <EmptyState emoji="📉" title="No orders in this range" body="Pick a different range." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi label="Revenue" value={inr(data.revenue)} icon={TrendingUp} tone="lime" sub={`${data.units} units sold`} />
            <Kpi label="Orders" value={data.ok.length} icon={TrendingUp} tone="violet" delay={0.04} sub={`${data.all.length - data.ok.length} cancelled`} />
            <Kpi label="Avg order" value={inr(data.ok.length ? data.revenue / data.ok.length : 0)} icon={TrendingUp} tone="cyan" delay={0.08} />
            <Kpi label="Gross profit" value={inr(grossProfit)} icon={TrendingUp} tone="amber" delay={0.12} sub={`after ${inr(data.cogs)} cost of goods`} />
            <Kpi label="Fees collected" value={inr(data.fees)} icon={TrendingUp} tone="pink" delay={0.16} sub={`${inr(data.discounts)} given as coupons`} />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Panel title="Revenue by night" className="xl:col-span-2">
              <div className="h-72">
                <ResponsiveContainer>
                  <LineChart data={data.nights} margin={{ left: -6, right: 8, top: 8 }}>
                    <CartesianGrid vertical={false} stroke={c.line} strokeDasharray="3 3" />
                    <XAxis dataKey="night" tick={{ fill: c.muted, fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis yAxisId="r" tick={{ fill: c.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
                    <YAxis yAxisId="o" orientation="right" allowDecimals={false} tick={{ fill: c.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...tip} cursor={{ stroke: c.line }} formatter={(v: number, n: string) => (n === 'Revenue' ? inr(v) : v)} />
                    <Legend wrapperStyle={{ fontSize: 12, color: c.muted }} />
                    <Line yAxisId="r" type="monotone" dataKey="revenue" name="Revenue" stroke={c.lime} strokeWidth={2.5} dot={false} />
                    <Line yAxisId="o" type="monotone" dataKey="orders" name="Orders" stroke={c.violet} strokeWidth={2.5} dot={false} />
                    <Line yAxisId="o" type="monotone" dataKey="cancelled" name="Cancelled" stroke={c.pink} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Orders by hostel">
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={data.hostels} margin={{ left: -18, right: 8, top: 8 }}>
                    <CartesianGrid vertical={false} stroke={c.line} strokeDasharray="3 3" />
                    <XAxis dataKey="short" tick={{ fill: c.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: c.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...tip} formatter={(v: number, n: string) => (n === 'Revenue' ? inr(v) : v)} />
                    <Bar dataKey="orders" name="Orders" fill={c.cyan} radius={[8, 8, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Panel title="Best sellers" flush>
              <div className="overflow-x-auto" data-lenis-prevent>
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="text-left text-[12px] uppercase tracking-wider text-muted">
                    <tr className="border-b border-line/60">
                      <th className="px-4 py-2.5 font-semibold">Item</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Units</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Revenue</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/40">
                    {data.products.slice(0, 15).map((p) => (
                      <tr key={p.id} className="hover:bg-surface2/40">
                        <td className="max-w-[220px] truncate px-4 py-2">{p.name}</td>
                        <td className="px-3 py-2 text-right">{p.qty}</td>
                        <td className="price px-3 py-2 text-right">{inr(p.revenue)}</td>
                        <td className="price px-4 py-2 text-right font-semibold text-lime">{inr(Math.round(p.profit))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel title="Category performance" flush>
              <div className="overflow-x-auto" data-lenis-prevent>
                <table className="w-full min-w-[360px] text-sm">
                  <thead className="text-left text-[12px] uppercase tracking-wider text-muted">
                    <tr className="border-b border-line/60">
                      <th className="px-4 py-2.5 font-semibold">Category</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Units</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Revenue</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/40">
                    {data.cats.map((x) => (
                      <tr key={x.id}>
                        <td className="px-4 py-2">{x.name}</td>
                        <td className="px-3 py-2 text-right">{x.qty}</td>
                        <td className="price px-3 py-2 text-right">{inr(x.revenue)}</td>
                        <td className="px-4 py-2 text-right text-muted">{data.itemRevenue ? Math.round((x.revenue / data.itemRevenue) * 100) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
