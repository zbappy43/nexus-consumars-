import { X } from 'lucide-react';
import type { CmsContentMap, CmsPageKey, Locale, SiteSettings } from '../types/domain';
import { t } from '../lib/i18n';

interface CmsModalProps {
  page: CmsPageKey | null;
  onClose: () => void;
  locale: Locale;
  settings: SiteSettings;
  cmsContent: CmsContentMap;
}

export function CmsModal({ page, onClose, locale, settings, cmsContent }: CmsModalProps) {
  if (!page) return null;

  const entry = cmsContent?.[page];
  if (!entry) return null;
  const title = locale === 'bn' ? entry.titleBn : entry.titleEn;
  const paragraphs = entry.body.split('\n').filter((line) => line.trim().length > 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-white border border-slate-200 rounded-lg max-w-xl w-full shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#13204A]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-[#13204A] cursor-pointer"
            aria-label={t(locale, 'close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 text-sm text-slate-600 leading-relaxed overflow-y-auto">
          {paragraphs.map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
          {page === 'contact' && (
            <div className="pt-3 border-t border-slate-200 text-xs text-slate-700 space-y-1 font-mono">
              <p>Support Phone: {settings.supportPhone}</p>
              <p>Support Email: {settings.supportEmail}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
