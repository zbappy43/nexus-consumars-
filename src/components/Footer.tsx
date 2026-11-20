import type { AppSection, CmsPageKey, Locale, SiteSettings } from '../types/domain';
import { t } from '../lib/i18n';

interface FooterProps {
  locale: Locale;
  settings: SiteSettings;
  onSelectSection: (section: AppSection) => void;
  onOpenCms: (page: CmsPageKey) => void;
}

export function Footer({ locale, settings, onSelectSection, onOpenCms }: FooterProps) {
  return (
    <footer className="bg-[#13204A] text-slate-200 mt-16 border-t border-[#1E3168]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Column 1: Corporate Identity */}
        <div className="md:col-span-2 space-y-3">
          <h3 className="text-lg font-bold text-white tracking-tight">
            {t(locale, 'brandFull')}
          </h3>
          <p className="text-sm text-slate-300 max-w-md leading-relaxed">
            {t(locale, 'brandParent')} · nexusglobalplc.com
          </p>
          <div className="pt-2 text-sm text-slate-300 space-y-1">
            <p className="font-semibold text-white">{t(locale, 'corporateOffice')}</p>
            <p>{t(locale, 'officeAddress')}</p>
            <p className="text-xs text-slate-400 pt-1">
              {settings.supportPhone} · {settings.supportEmail}
            </p>
          </div>
        </div>

        {/* Column 2: Quick Navigation */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white">{t(locale, 'quickLinks')}</h4>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>
              <button
                type="button"
                onClick={() => onSelectSection('store')}
                className="hover:text-[#E8892B] transition-colors cursor-pointer"
              >
                {t(locale, 'navShop')}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onSelectSection('member')}
                className="hover:text-[#E8892B] transition-colors cursor-pointer"
              >
                {t(locale, 'navMember')}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onSelectSection('dealer')}
                className="hover:text-[#E8892B] transition-colors cursor-pointer"
              >
                {t(locale, 'navDealer')}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onSelectSection('track')}
                className="hover:text-[#E8892B] transition-colors cursor-pointer"
              >
                {t(locale, 'navTrack')}
              </button>
            </li>
          </ul>
        </div>

        {/* Column 3: Legal & CMS Policies */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white">{t(locale, 'legalPolicies')}</h4>
          <ul className="space-y-2 text-sm text-slate-300">
            {(
              [
                ['about', 'cmsAbout'],
                ['contact', 'cmsContact'],
                ['privacy', 'cmsPrivacy'],
                ['terms', 'cmsTerms'],
                ['refund', 'cmsRefund'],
                ['faq', 'cmsFaq'],
              ] as const
            ).map(([key, labelKey]) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onOpenCms(key)}
                  className="hover:text-[#E8892B] transition-colors cursor-pointer"
                >
                  {t(locale, labelKey)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom Legal & Payment Methods Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <p>{t(locale, 'copyright')}</p>
          <div className="flex flex-wrap items-center gap-3 text-slate-300 font-medium">
            <span className="text-slate-400">{t(locale, 'paymentPartners')}:</span>
            <span>Cash on Delivery</span>
            <span aria-hidden="true">·</span>
            <span>bKash</span>
            <span aria-hidden="true">·</span>
            <span>Nagad</span>
            <span aria-hidden="true">·</span>
            <span>SSLCommerz</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
