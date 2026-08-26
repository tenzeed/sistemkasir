import {
  LayoutDashboard, ShoppingCart, Package, Boxes, CalendarClock, History,
  Wallet, BarChart3, Settings as SettingsIcon, Store, LogOut, Menu, MoreHorizontal,
} from 'lucide-react';
import { NAV_ITEMS } from '../lib/constants';
import { Modal } from './ui.jsx';
import { cx } from '../lib/helpers';

const ICONS = {
  dashboard: LayoutDashboard, pos: ShoppingCart, products: Package, stock: Boxes,
  exp: CalendarClock, history: History, finance: Wallet, reports: BarChart3, settings: SettingsIcon,
};

export function Sidebar({ active, onNav, onLogout, storeName, adminName, alertCount }) {
  return (
    <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-warung-hero bg-grain text-white h-screen sticky top-0">
      <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center flex-shrink-0">
          <Store size={20} className="text-marigold-300" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm truncate">{storeName}</p>
          <p className="text-warung-200 text-xs truncate">Admin: {adminName}</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.id];
          const isActive = active === item.id;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onNav(item.id)}
              className={cx(
                'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors relative active:scale-[0.98]',
                isActive ? 'bg-white text-warung-800 shadow-sm' : 'text-warung-100 hover:bg-white/10'
              )}
            >
              <Icon size={18} strokeWidth={2.2} />
              {item.label}
              {item.id === 'exp' && alertCount > 0 && (
                <span className={cx('ml-auto text-xs font-bold rounded-full px-1.5 py-0.5', isActive ? 'bg-chili-100 text-chili-700' : 'bg-chili-500 text-white')}>{alertCount}</span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <button type="button" onClick={onLogout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-warung-200 hover:bg-white/10 transition-colors">
          <LogOut size={18} />
          Keluar
        </button>
      </div>
    </aside>
  );
}

export function TopBar({ title, onMenu }) {
  return (
    <div className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-ink-100 px-4 py-3.5 flex items-center justify-between">
      <h1 className="font-bold text-ink-900">{title}</h1>
      <button type="button" onClick={onMenu} className="w-9 h-9 rounded-full hover:bg-ink-100 flex items-center justify-center text-ink-500 active:scale-95 transition-transform">
        <Menu size={20} />
      </button>
    </div>
  );
}

export function MoreSheet({ open, onClose, onNav, onLogout }) {
  const items = NAV_ITEMS.filter((n) => !['dashboard', 'pos', 'stock', 'exp'].includes(n.id));
  return (
    <Modal open={open} onClose={onClose} title="Menu Lainnya" maxW="max-w-sm">
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = ICONS[item.id];
          return (
            <button type="button" key={item.id} onClick={() => { onNav(item.id); onClose(); }} className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-ink-700 hover:bg-ink-50">
              <Icon size={18} className="text-ink-400" />
              {item.label}
            </button>
          );
        })}
        <div className="dashed-rule my-2" />
        <button type="button" onClick={onLogout} className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-chili-600 hover:bg-chili-50">
          <LogOut size={18} />
          Keluar
        </button>
      </div>
    </Modal>
  );
}

export function BottomNav({ active, onNav, onMore, alertCount }) {
  const items = [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'stock', label: 'Stok', icon: Boxes },
    { id: 'pos', label: 'Transaksi', icon: ShoppingCart, emphasize: true },
    { id: 'exp', label: 'EXP', icon: CalendarClock, badge: alertCount },
    { id: 'more', label: 'Menu', icon: MoreHorizontal },
  ];
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-ink-100 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center justify-between">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        if (item.emphasize) {
          return (
            <button type="button" key={item.id} onClick={() => onNav('pos')} className="flex flex-col items-center gap-1 -mt-7 active:scale-95 transition-transform">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-warung-500 to-warung-700 shadow-pop flex items-center justify-center text-white ring-4 ring-white">
                <Icon size={22} />
              </div>
              <span className="text-[10px] font-bold text-warung-700">{item.label}</span>
            </button>
          );
        }
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => (item.id === 'more' ? onMore() : onNav(item.id))}
            className="flex flex-col items-center gap-1 px-2 py-1.5 relative active:scale-95 transition-transform"
          >
            <Icon size={20} strokeWidth={2.2} className={isActive ? 'text-warung-700' : 'text-ink-300'} />
            <span className={cx('text-[10px] font-bold', isActive ? 'text-warung-700' : 'text-ink-300')}>{item.label}</span>
            {!!item.badge && <span className="absolute top-0 right-1 w-4 h-4 rounded-full bg-chili-500 text-white text-[9px] font-bold flex items-center justify-center">{item.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
