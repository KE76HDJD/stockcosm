import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingBag,
  ShoppingCart,
  ArrowDownToLine,
  History,
  FileText,
  Users,
  LogOut,
  UserCog,
  Menu,
  X,
  Download,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord', roles: ['ADMIN', 'ASSISTANT'] },
  { to: '/produits', icon: Package, label: 'Produits', roles: ['ADMIN', 'ASSISTANT'] },
  { to: '/categories', icon: Tags, label: 'Catégories', roles: ['ADMIN', 'ASSISTANT'] },
  { to: '/ventes/nouvelle', icon: ShoppingCart, label: 'Nouvelle vente', roles: ['ADMIN', 'ASSISTANT'] },
  { to: '/ventes', icon: ShoppingBag, label: 'Historique ventes', roles: ['ADMIN', 'ASSISTANT'] },
  { to: '/entrees', icon: ArrowDownToLine, label: 'Entrées de stock', roles: ['ADMIN', 'ASSISTANT'] },
  { to: '/mouvements', icon: History, label: 'Sorties de stock', roles: ['ADMIN', 'ASSISTANT'] },
  { to: '/inventaire', icon: FileText, label: 'Inventaire', roles: ['ADMIN', 'ASSISTANT'] },
  { to: '/utilisateurs', icon: Users, label: 'Utilisateurs', roles: ['ADMIN'] },
  { to: '/profil', icon: UserCog, label: 'Mon profil', roles: ['ADMIN', 'ASSISTANT'] },
];

const storeName = "KET SKIN CARE BY MINA LA PREFEREE";

function AnimatedStoreName() {
  const [typed, setTyped] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (typed < storeName.length) {
      const timer = setTimeout(() => setTyped(typed + 1), 40);
      return () => clearTimeout(timer);
    }
  }, [typed]);

  useEffect(() => {
    const interval = setInterval(() => setShowCursor((c) => !c), 530);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <h1
        className="font-heading font-700 text-sm leading-tight tracking-wide truncate"
        style={{
          color: '#E8751A',
          textShadow: '0 0 20px rgba(232, 117, 26, 0.4), 0 0 40px rgba(232, 117, 26, 0.15)',
        }}
      >
        {storeName.split('').map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.3, y: -8 }}
            animate={i < typed ? {
              opacity: 1,
              scale: 1,
              y: 0,
            } : {
              opacity: 0,
              scale: 0.3,
              y: -8,
            }}
            transition={{
              type: 'spring',
              stiffness: 600,
              damping: 15,
              mass: 0.5,
            }}
            className="inline-block"
            style={i < typed ? {
              textShadow: '0 0 8px rgba(232, 117, 26, 0.6)',
            } : undefined}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
        <motion.span
          animate={{ opacity: showCursor ? 1 : 0 }}
          transition={{ duration: 0.1 }}
          className="inline-block font-body font-300"
          style={{ color: '#E8751A' }}
        >
          |
        </motion.span>
      </h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: storeName.length * 0.04 + 0.3 }}
        className="text-xs text-text-secondary mt-1"
      >
        Gestion de stock
      </motion.p>
    </div>
  );
}

interface SidebarContentProps {
  onNavigate?: () => void;
}

function SidebarContent({ onNavigate }: SidebarContentProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const filtered = navItems.filter((item) => item.roles.includes(user?.role || ''));
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setCanInstall(true);
      window._deferredInstallPrompt = e as any;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    const prompt = window._deferredInstallPrompt;
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') setCanInstall(false);
      window._deferredInstallPrompt = null;
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    onNavigate?.();
  };

  return (
    <>
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border dark:border-white/[0.08]">
        <AnimatedStoreName />
      </div>

      <nav className="flex-1 py-3 sm:py-4 px-2 sm:px-3 space-y-0.5 overflow-y-auto">
        {filtered.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-button text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'text-accent dark:text-[#3ECF8E] bg-accent/5 dark:bg-[#3ECF8E]/10 font-600'
                  : 'text-text-secondary dark:text-[#8B9199] hover:text-text-primary dark:hover:text-[#E4E6E9] hover:bg-porcelaine dark:hover:bg-white/[0.05]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 w-[3px] h-5 bg-accent dark:bg-[#3ECF8E] rounded-r"
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  />
                )}
                <item.icon size={18} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-3 sm:py-4 border-t border-border dark:border-white/[0.08]">
        <div className="px-3 mb-2">
          <p className="text-sm font-medium text-text-primary dark:text-[#E4E6E9]">{user?.username}</p>
          <p className="text-xs text-text-secondary dark:text-[#8B9199] capitalize">{user?.role === 'ADMIN' ? 'Administrateur' : 'Assistant'}</p>
        </div>
        <ThemeToggle />
        {canInstall && !isInstalled && (
          <button
            onClick={handleInstall}
            className="flex items-center gap-3 px-3 py-2.5 rounded-button text-sm font-medium text-vert dark:text-[#3ECF8E] bg-vert/5 dark:bg-[#3ECF8E]/10 hover:bg-vert/10 dark:hover:bg-[#3ECF8E]/15 transition-colors w-full mt-1"
          >
            <Download size={18} />
            <span>Installer l'application</span>
          </button>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-button text-sm text-text-secondary dark:text-[#8B9199] hover:text-stock-rupture hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors w-full"
        >
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </>
  );
}

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-sidebar bg-white dark:bg-[#1C1F22] border-r border-border dark:border-white/[0.08] flex-col z-30">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            key="sidebar-panel"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-[#1C1F22] z-50 flex flex-col lg:hidden shadow-xl"
          >
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={onClose}
                className="p-2 rounded-button hover:bg-porcelaine dark:hover:bg-white/[0.05] transition-colors"
              >
                <X size={20} className="text-text-secondary dark:text-[#8B9199]" />
              </button>
            </div>
            <SidebarContent onNavigate={onClose} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

export function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden fixed top-4 left-4 z-30 p-2.5 bg-white dark:bg-[#1C1F22] rounded-button border border-border dark:border-white/[0.08] shadow-sm hover:bg-porcelaine dark:hover:bg-white/[0.05] transition-colors"
    >
      <Menu size={20} className="text-text-primary dark:text-[#E4E6E9]" />
    </button>
  );
}
