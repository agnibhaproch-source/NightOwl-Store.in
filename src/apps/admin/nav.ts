import { BarChart3, Boxes, ClipboardList, LayoutDashboard, Megaphone, MessageSquareQuote, Settings2, Store, Tags, TicketPercent, Users, Layers, Image } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: typeof Store;
  owner?: boolean;
  group: 'Run' | 'Catalog' | 'Grow' | 'Insights';
  keywords?: string;
}

export const NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, group: 'Run', keywords: 'home kpi stats' },
  { to: '/admin/orders', label: 'Live orders', icon: ClipboardList, group: 'Run', keywords: 'kanban queue' },
  { to: '/admin/store', label: 'Store controls', icon: Store, group: 'Run', owner: true, keywords: 'open close hours fees hostels settings' },
  { to: '/admin/products', label: 'Products & stock', icon: Boxes, group: 'Catalog', keywords: 'inventory items restock' },
  { to: '/admin/categories', label: 'Categories', icon: Tags, group: 'Catalog', owner: true },
  { to: '/admin/combos', label: 'Combo builder', icon: Layers, group: 'Catalog', owner: true, keywords: 'bundle' },
  { to: '/admin/coupons', label: 'Coupons', icon: TicketPercent, group: 'Grow', owner: true, keywords: 'discount code' },
  { to: '/admin/banners', label: 'Home banners', icon: Image, group: 'Grow', owner: true, keywords: 'carousel offers' },
  { to: '/admin/broadcast', label: 'Broadcast', icon: Megaphone, group: 'Grow', owner: true, keywords: 'notification push message' },
  { to: '/admin/customers', label: 'Customers', icon: Users, group: 'Insights', owner: true, keywords: 'users block' },
  { to: '/admin/reviews', label: 'Ratings & reviews', icon: MessageSquareQuote, group: 'Insights', keywords: 'feedback stars' },
  { to: '/admin/reports', label: 'Sales reports', icon: BarChart3, group: 'Insights', owner: true, keywords: 'csv export revenue' }
];

export const SettingsIcon = Settings2;
