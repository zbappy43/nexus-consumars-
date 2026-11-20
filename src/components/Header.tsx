import { useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';
import type { AppSection, AuthSession, Locale, Role } from '../types/domain';
import { t } from '../lib/i18n';
import { formatNumber } from '../lib/money';
import { hasAnyAdminPermission, ROLE_LABELS } from '../lib/rbac';

interface HeaderProps {
  locale: Locale;
  onChangeLocale: (locale: Locale) => void;
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  cartCount: number;
  onOpenCart: () => void;
  session: AuthSession;
  onSwitchRole: (role: Role) => void;
  onOpenAuth: (tab?: 'login' | 'register' | 'kyc') => void;
}

const DEMO_ROLES: Role[] = [
  'CUSTOMER',
  'MEMBER',
  'DEALER',
  'SUPER_ADMIN',
  'FINANCE',
  'KYC_OFFICER',
  'ORDER_MANAGER',
];

export function Header({
  locale,
  onChangeLocale,
  activeSection,
  onSelectSection,
  cartCount,
  onOpenCart,
  session,
  onSwitchRole,
  onOpenAuth,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const canAccessAdmin = hasAnyAdminPermission(session.role);

  const navItems: Array<{ id: AppSection; label: string }> = [
    { id: 'store', label: t(locale, 'navShop') },
    { id: 'member', label: t(locale, 'navMember') },
    { id: 'dealer', label: t(locale, 'navDealer') },
    ...(canAccessAdmin ? [{ id: 'admin' as const, label: t(locale, 'navAdmin') }] : []),
    { id: 'track', label: t(locale, 'navTrack') },
  ];

  return (
    <div className="bg-white border-b border-slate-200">
      {/* Strict 3-Zone Top Bar Contract (Sticky, compact <= 64px for mobile sticky cap) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => onSelectSection('store')}
            className="text-lg sm:text-xl font-bold tracking-tight text-[#13204A] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#13204A]"
          >
            {t(locale, 'brandName')}
          </button>

          {/* Zone 2: 5 concise single-line text nav links */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectSection(item.id)}
                  className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                    isActive
                      ? 'text-[#13204A] border-[#E8892B] font-semibold'
                      : 'text-slate-600 border-transparent hover:text-[#13204A] hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action + Mobile Drawer Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenCart}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8892B]"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>{t(locale, 'bag')}</span>
              <span className="font-mono tabular-nums text-[#E8892B]">
                ({formatNumber(cartCount, locale)})
              </span>
            </button>

            <button
              type="button"
              aria-label="Toggle Menu"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2.5 text-slate-700 hover:text-[#13204A] rounded-md cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectSection(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`text-left px-3 py-2.5 rounded-md text-sm font-medium ${
                  activeSection === item.id
                    ? 'bg-[#13204A] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Non-sticky Workspace Utility Strip (Language Switcher, Role Context & Auth/KYC) */}
      <div className="bg-[#F8FAFC] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Bangla / English segmented switcher */}
            <div
              className="inline-flex items-center bg-slate-200/70 p-0.5 rounded-md"
              role="group"
              aria-label="Language"
            >
              <button
                type="button"
                onClick={() => onChangeLocale('bn')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  locale === 'bn'
                    ? 'bg-white text-[#13204A] shadow-xs'
                    : 'text-slate-600 hover:text-[#13204A]'
                }`}
              >
                {t(locale, 'langBn')}
              </button>
              <button
                type="button"
                onClick={() => onChangeLocale('en')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  locale === 'en'
                    ? 'bg-white text-[#13204A] shadow-xs'
                    : 'text-slate-600 hover:text-[#13204A]'
                }`}
              >
                {t(locale, 'langEn')}
              </button>
            </div>

            <span className="hidden sm:inline text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="hidden sm:inline text-slate-600">
              {t(locale, 'brandFull')}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="inline-flex items-center gap-2">
              <span className="text-slate-500">{t(locale, 'rolePreview')}:</span>
              <select
                value={session.role}
                onChange={(e) => onSwitchRole(e.target.value as Role)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-medium text-[#13204A] focus:outline-none focus:border-[#13204A] cursor-pointer"
              >
                {DEMO_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r][locale]}
                  </option>
                ))}
              </select>
            </label>

            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>

            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="font-semibold text-[#13204A] hover:text-[#E8892B] transition-colors whitespace-nowrap cursor-pointer"
            >
              {t(locale, 'signIn')}
            </button>

            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>

            <button
              type="button"
              onClick={() => onOpenAuth('kyc')}
              className="font-semibold text-[#E8892B] hover:text-[#CF751C] transition-colors whitespace-nowrap cursor-pointer"
            >
              {t(locale, 'becomeMember')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
