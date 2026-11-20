import { useEffect, useState } from 'react';
import { Printer, Search } from 'lucide-react';
import type { Locale, Order, OrderStatus } from '../types/domain';
import { t } from '../lib/i18n';
import { formatBDT, formatNumber, formatPV } from '../lib/money';

interface OrderTrackingViewProps {
  locale: Locale;
  orders: Order[];
  initialOrderId?: string;
}

const PROGRESS_STEPS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
];

export function OrderTrackingView({ locale, orders, initialOrderId }: OrderTrackingViewProps) {
  const [query, setQuery] = useState(initialOrderId || orders[0]?.id || 'NCL-2026-1001');
  const [searchedId, setSearchedId] = useState(initialOrderId || orders[0]?.id || 'NCL-2026-1001');

  useEffect(() => {
    if (initialOrderId) {
      setQuery(initialOrderId);
      setSearchedId(initialOrderId);
    }
  }, [initialOrderId]);

  const foundOrder = orders.find(
    (o) => o.id.toLowerCase() === searchedId.trim().toLowerCase()
  );

  const currentStepIndex = foundOrder ? PROGRESS_STEPS.indexOf(foundOrder.status) : -1;

  const handlePrintInvoice = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#13204A] tracking-tight">
          {t(locale, 'trackHeading')}
        </h1>
        <p className="text-sm text-slate-600">{t(locale, 'trackSubtitle')}</p>
      </div>

      {/* Search Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearchedId(query);
        }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(locale, 'trackPlaceholder')}
            className="w-full pl-9 pr-3 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#13204A]"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-2.5 text-sm font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md whitespace-nowrap cursor-pointer"
        >
          {t(locale, 'trackBtn')}
        </button>
      </form>

      {/* Quick Order IDs */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>{locale === 'bn' ? 'সাম্প্রতিক অর্ডার:' : 'Recent Orders:'}</span>
        {orders.slice(0, 4).map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              setQuery(o.id);
              setSearchedId(o.id);
            }}
            className={`font-mono underline-offset-4 hover:underline cursor-pointer ${
              searchedId === o.id ? 'text-[#13204A] font-semibold underline' : 'text-slate-600'
            }`}
          >
            {o.id}
          </button>
        ))}
      </div>

      {!foundOrder ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-sm text-slate-600">
          {t(locale, 'orderNotFound')}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-8">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
            <div className="space-y-1">
              <p className="text-xs font-mono text-slate-500">
                {t(locale, 'brandFull')} · {foundOrder.channel}
              </p>
              <h2 className="text-xl font-bold font-mono text-[#13204A]">{foundOrder.id}</h2>
              <p className="text-xs text-slate-600">
                {foundOrder.customerName} · {foundOrder.customerPhone} · {foundOrder.upazila},{' '}
                {foundOrder.district}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-semibold text-[#13204A]">
                {foundOrder.status}
              </span>
              <button
                type="button"
                onClick={handlePrintInvoice}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#13204A] border border-slate-300 hover:border-[#13204A] rounded-md cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t(locale, 'printInvoice')}</span>
              </button>
            </div>
          </div>

          {/* Stepper */}
          {currentStepIndex >= 0 && (
            <div className="grid grid-cols-5 gap-2">
              {PROGRESS_STEPS.map((st, idx) => {
                const done = idx <= currentStepIndex;
                return (
                  <div key={st} className="space-y-2">
                    <div
                      className={`h-1.5 rounded-sm ${done ? 'bg-[#13204A]' : 'bg-slate-200'}`}
                    />
                    <p
                      className={`text-[11px] font-mono ${
                        done ? 'text-[#13204A] font-semibold' : 'text-slate-400'
                      }`}
                    >
                      {st}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* PV Status Callout */}
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-md px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-700">
              {foundOrder.pvReversed
                ? t(locale, 'pvReversedNote')
                : foundOrder.pvCredited
                ? t(locale, 'pvCreditedNote')
                : t(locale, 'pvPendingNote')}
            </span>
            <span className="font-mono tabular-nums font-bold text-[#E8892B]">
              {foundOrder.pvReversed ? '-' : '+'}
              {formatPV(foundOrder.totalPv, locale)}
            </span>
          </div>

          {/* Snapshotted Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 font-medium">Item / SKU</th>
                  <th className="py-2.5 font-medium text-right">Qty</th>
                  <th className="py-2.5 font-medium text-right">Unit Snapshot</th>
                  <th className="py-2.5 font-medium text-right">PV</th>
                  <th className="py-2.5 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {foundOrder.items.map((item) => (
                  <tr key={`${item.sku}-${item.variantId}`}>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-900">
                        {locale === 'bn' ? item.nameBn : item.nameEn}
                      </p>
                      <p className="text-slate-500 font-mono">
                        {item.sku} · {locale === 'bn' ? item.variantLabelBn : item.variantLabelEn}
                      </p>
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums">
                      {formatNumber(item.quantity, locale)}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums">
                      {formatBDT(item.unitChargedPaisa, locale)}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-[#E8892B]">
                      +{formatPV(item.unitPv * item.quantity, locale)}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums font-semibold text-[#13204A]">
                      {formatBDT(item.unitChargedPaisa * item.quantity, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Audit History */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-200">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-[#13204A]">Status History</h3>
              <ul className="space-y-2 text-xs text-slate-600">
                {foundOrder.history.map((h, i) => (
                  <li key={`${h.status}-${i}`} className="flex flex-col">
                    <span className="font-mono font-semibold text-slate-800">
                      {h.status} · {h.at.slice(0, 16).replace('T', ' ')}
                    </span>
                    <span className="text-slate-500">
                      {h.actor}: {h.note}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{t(locale, 'subtotal')}</span>
                <span className="font-mono tabular-nums">
                  {formatBDT(foundOrder.subtotalPaisa, locale)}
                </span>
              </div>
              {foundOrder.discountPaisa > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>{t(locale, 'discount')}</span>
                  <span className="font-mono tabular-nums">
                    -{formatBDT(foundOrder.discountPaisa, locale)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>{t(locale, 'deliveryCharge')}</span>
                <span className="font-mono tabular-nums">
                  {formatBDT(foundOrder.deliveryChargePaisa, locale)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#13204A] pt-2 border-t border-slate-200">
                <span>{t(locale, 'totalPayable')}</span>
                <span className="font-mono tabular-nums">
                  {formatBDT(foundOrder.totalPaisa, locale)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
