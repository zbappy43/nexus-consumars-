import { useEffect, useMemo, useState } from 'react';
import { Download, Lock, Plus, RotateCcw, ShieldAlert } from 'lucide-react';
import { Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type {
  AuditLogEntry,
  AuthSession,
  CmsContentMap,
  CmsPageKey,
  CommissionRun,
  Coupon,
  DealerApplication,
  KycSubmission,
  Locale,
  MemberNode,
  Order,
  OrderStatus,
  Product,
  ProductCategoryId,
  RankConfig,
  SiteSettings,
  WalletLedgerEntry,
  WithdrawalRequest,
} from '../types/domain';
import { ASSET_URLS } from '../data/seedData';
import { t } from '../lib/i18n';
import { formatBDT, formatNumber, formatPV } from '../lib/money';
import { hasAnyAdminPermission, hasPermission, ROLE_LABELS } from '../lib/rbac';

interface AdminPanelViewProps {
  locale: Locale;
  session: AuthSession;
  products: Product[];
  coupons: Coupon[];
  dealerApplications: DealerApplication[];
  cmsContent: CmsContentMap;
  members: Record<string, MemberNode>;
  ledger: WalletLedgerEntry[];
  orders: Order[];
  kycSubmissions: KycSubmission[];
  commissionRuns: CommissionRun[];
  withdrawals: WithdrawalRequest[];
  settings: SiteSettings;
  ranks: RankConfig[];
  auditLogs: AuditLogEntry[];
  onUpdateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  onReviewKyc: (kycId: string, decision: 'APPROVED' | 'REJECTED', reason?: string) => void;
  onGenerateCommissionDryRun: (periodLabel: string) => void;
  onApproveAndLockCommissionRun: (runId: string) => void;
  onUpdateWithdrawal: (
    wdId: string,
    status: 'PAID' | 'REJECTED',
    txReferenceOrReason: string
  ) => void;
  onSaveSettings: (next: SiteSettings) => void;
  onAddProduct: (product: Product) => void;
  onUpdateVariant: (
    productId: string,
    variantId: string,
    patch: { mrpPaisa?: number; memberPricePaisa?: number; pv?: number; stock?: number }
  ) => void;
  onToggleCoupon: (code: string) => void;
  onAddCoupon: (coupon: Coupon) => void;
  onReviewDealerApplication: (appId: string, decision: 'APPROVED' | 'REJECTED') => void;
  onUpdateCmsPage: (page: CmsPageKey, body: string) => void;
  onResetDemoData: () => void;
  onSwitchToAdmin?: () => void;
}

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
  'REFUNDED',
];

const CATEGORY_IMAGE_MAP: Record<Exclude<ProductCategoryId, 'all'>, string> = {
  groceries: ASSET_URLS.groceries,
  personal_care: ASSET_URLS.personalCare,
  household: ASSET_URLS.household,
  beverages: ASSET_URLS.beverages,
  fashion: ASSET_URLS.fashion,
};

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AdminPanelView({
  locale,
  session,
  products,
  coupons,
  dealerApplications,
  cmsContent,
  members,
  ledger,
  orders,
  kycSubmissions,
  commissionRuns,
  withdrawals,
  settings,
  ranks,
  auditLogs,
  onUpdateOrderStatus,
  onReviewKyc,
  onGenerateCommissionDryRun,
  onApproveAndLockCommissionRun,
  onUpdateWithdrawal,
  onSaveSettings,
  onAddProduct,
  onUpdateVariant,
  onToggleCoupon,
  onAddCoupon,
  onReviewDealerApplication,
  onUpdateCmsPage,
  onResetDemoData,
  onSwitchToAdmin,
}: AdminPanelViewProps) {
  const [tab, setTab] = useState<
    'orders' | 'catalogue' | 'kyc' | 'commission' | 'withdrawals' | 'marketing' | 'reports' | 'settings' | 'audit'
  >('orders');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [periodLabel, setPeriodLabel] = useState('2026-11 (Cycle 2)');
  const [draftSettings, setDraftSettings] = useState<SiteSettings>(settings);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState('');
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  // New Product Form State
  const [newProdNameEn, setNewProdNameEn] = useState('');
  const [newProdNameBn, setNewProdNameBn] = useState('');
  const [newProdBrand, setNewProdBrand] = useState('Nexus Essentials');
  const [newProdCat, setNewProdCat] = useState<Exclude<ProductCategoryId, 'all'>>('groceries');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdMrp, setNewProdMrp] = useState('450');
  const [newProdMemberPrice, setNewProdMemberPrice] = useState('390');
  const [newProdPv, setNewProdPv] = useState('15');
  const [newProdStock, setNewProdStock] = useState('60');
  const [catalogueMsg, setCatalogueMsg] = useState('');

  // New Coupon Form State
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [couponValue, setCouponValue] = useState('10');
  const [couponMinTaka, setCouponMinTaka] = useState('1000');

  // CMS Editor State
  const [selectedCmsKey, setSelectedCmsKey] = useState<CmsPageKey>('about');
  const [cmsDraftBody, setCmsDraftBody] = useState(cmsContent?.about?.body ?? '');
  const [cmsSavedMsg, setCmsSavedMsg] = useState('');

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  useEffect(() => {
    setCmsDraftBody(cmsContent?.[selectedCmsKey]?.body ?? '');
  }, [cmsContent, selectedCmsKey]);

  const categorySalesBreakdown = useMemo(() => {
    const productCatById = new Map<string, string>();
    products.forEach((p) => productCatById.set(p.id, p.categoryId));
    const totals: Record<string, number> = {
      groceries: 0,
      personal_care: 0,
      household: 0,
      beverages: 0,
      fashion: 0,
    };
    orders
      .filter((o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
      .forEach((o) => {
        o.items.forEach((item) => {
          const cat = productCatById.get(item.productId) || 'groceries';
          totals[cat] = (totals[cat] || 0) + item.unitChargedPaisa * item.quantity;
        });
      });
    const maxVal = Math.max(1, ...Object.values(totals));
    return Object.entries(totals).map(([cat, amountPaisa]) => ({
      cat,
      amountPaisa,
      pct: Math.round((amountPaisa / maxVal) * 100),
    }));
  }, [orders, products]);

  const orderStatusDistribution = useMemo(() => {
    const counts = {
      PENDING: 0,
      CONFIRMED: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      OTHER: 0,
    };
    orders.forEach((o) => {
      if (o.status === 'PENDING') counts.PENDING += 1;
      else if (o.status === 'CONFIRMED') counts.CONFIRMED += 1;
      else if (o.status === 'PROCESSING') counts.PROCESSING += 1;
      else if (o.status === 'SHIPPED') counts.SHIPPED += 1;
      else if (o.status === 'DELIVERED') counts.DELIVERED += 1;
      else counts.OTHER += 1;
    });

    const core = [
      {
        statusKey: 'PENDING',
        name: locale === 'bn' ? 'পেন্ডিং' : 'Pending',
        value: counts.PENDING,
        color: '#E8892B',
      },
      {
        statusKey: 'CONFIRMED',
        name: locale === 'bn' ? 'কনফার্মড' : 'Confirmed',
        value: counts.CONFIRMED,
        color: '#13204A',
      },
      {
        statusKey: 'SHIPPED',
        name: locale === 'bn' ? 'শিপড' : 'Shipped',
        value: counts.SHIPPED,
        color: '#2563EB',
      },
      {
        statusKey: 'DELIVERED',
        name: locale === 'bn' ? 'ডেলিভার্ড' : 'Delivered',
        value: counts.DELIVERED,
        color: '#059669',
      },
    ];

    if (counts.PROCESSING > 0) {
      core.splice(2, 0, {
        statusKey: 'PROCESSING',
        name: locale === 'bn' ? 'প্রসেসিং' : 'Processing',
        value: counts.PROCESSING,
        color: '#7C3AED',
      });
    }

    if (counts.OTHER > 0) {
      core.push({
        statusKey: 'OTHER',
        name: locale === 'bn' ? 'বাতিল / রিফান্ড' : 'Cancelled / Refunded',
        value: counts.OTHER,
        color: '#64748B',
      });
    }

    return core;
  }, [orders, locale]);

  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === 'ALL') return orders;
    if (orderStatusFilter === 'OTHER') {
      return orders.filter(
        (o) => !['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(o.status)
      );
    }
    return orders.filter((o) => o.status === orderStatusFilter);
  }, [orders, orderStatusFilter]);

  const renderOrderStatusDoughnut = (interactive = false) => {
    const total = orders.length;
    const chartSlices = orderStatusDistribution
      .filter((d) => d.value > 0)
      .map((entry) => ({
        statusKey: entry.statusKey,
        name: entry.name,
        value: entry.value,
        fill: entry.color,
        fillOpacity:
          interactive && orderStatusFilter !== 'ALL' && orderStatusFilter !== entry.statusKey
            ? 0.35
            : 1,
      }));

    return (
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#13204A]">
              {locale === 'bn' ? 'অর্ডার স্ট্যাটাস ডিস্ট্রিবিউশন' : 'Order Status Distribution'}
            </h2>
            <p className="text-xs text-slate-500">
              {locale === 'bn'
                ? 'পেন্ডিং, কনফার্মড, শিপড ও ডেলিভার্ড অর্ডার প্রবাহের তাৎক্ষণিক চিত্র'
                : 'Quick administrative overview of Pending, Confirmed, Shipped & Delivered order flow'}
            </p>
          </div>
          {interactive && orderStatusFilter !== 'ALL' ? (
            <button
              type="button"
              onClick={() => setOrderStatusFilter('ALL')}
              className="text-xs font-semibold text-[#E8892B] hover:underline cursor-pointer"
            >
              {locale === 'bn' ? 'ফিল্টার মুছুন' : 'Clear status filter'}
            </button>
          ) : (
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {formatNumber(total, locale)} {locale === 'bn' ? 'মোট অর্ডার' : 'total orders'}
            </span>
          )}
        </div>

        {total === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-xs text-slate-500">
            {locale === 'bn' ? 'কোনো অর্ডার ডেটা নেই।' : 'No orders available.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-5 relative h-[230px] min-w-0">
              <ResponsiveContainer
                width="100%"
                height={230}
                minWidth={0}
                initialDimension={{ width: 260, height: 230 }}
              >
                <PieChart>
                  <Pie
                    data={chartSlices}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={chartSlices.length > 1 ? 3 : 0}
                    strokeWidth={0}
                    isAnimationActive={false}
                    onClick={(entry) => {
                      const clickedKey =
                        (entry as { statusKey?: string; payload?: { statusKey?: string } })?.statusKey ??
                        (entry as { payload?: { statusKey?: string } })?.payload?.statusKey;
                      if (!interactive || !clickedKey) return;
                      setTab('orders');
                      setOrderStatusFilter((prev) => (prev === clickedKey ? 'ALL' : clickedKey));
                    }}
                    className={interactive ? 'cursor-pointer' : undefined}
                  />
                  <Tooltip
                    formatter={(val: unknown, name: unknown) => {
                      const num = Number(val) || 0;
                      const pct = total > 0 ? Math.round((num / total) * 100) : 0;
                      return [`${formatNumber(num, locale)} (${pct}%)`, String(name ?? '')];
                    }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold font-mono tabular-nums text-[#13204A]">
                  {formatNumber(total, locale)}
                </span>
                <span className="text-[11px] text-slate-500">
                  {locale === 'bn' ? 'মোট অর্ডার' : 'Orders'}
                </span>
              </div>
            </div>

            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {orderStatusDistribution.map((item) => {
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                const isSelected = interactive && orderStatusFilter === item.statusKey;
                return (
                  <button
                    key={item.statusKey}
                    type="button"
                    disabled={!interactive}
                    onClick={() => {
                      if (!interactive) return;
                      setTab('orders');
                      setOrderStatusFilter((prev) =>
                        prev === item.statusKey ? 'ALL' : item.statusKey
                      );
                    }}
                    className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-md border transition-colors text-left ${
                      isSelected
                        ? 'border-[#13204A] bg-[#13204A]/5 font-semibold'
                        : 'border-slate-200 bg-[#F8FAFC]'
                    } ${interactive ? 'cursor-pointer hover:border-[#13204A]' : 'cursor-default'}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-xs shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-slate-800 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                      <span className="font-bold text-[#13204A]">
                        {formatNumber(item.value, locale)}
                      </span>
                      <span className="text-slate-500 w-9 text-right">{pct}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!hasAnyAdminPermission(session.role)) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
        <ShieldAlert className="w-8 h-8 text-[#13204A] mx-auto" />
        <h1 className="text-2xl font-bold text-[#13204A]">{t(locale, 'adminHeading')}</h1>
        <p className="text-sm text-slate-600">{t(locale, 'permissionDenied')}</p>
        <p className="text-xs text-slate-500">
          Switch Session Role in the top utility bar to <strong>Super Admin</strong>,{' '}
          <strong>Finance Officer</strong>, <strong>KYC Officer</strong>, or{' '}
          <strong>Order Manager</strong> to test centralized RBAC enforcement.
        </p>
        {onSwitchToAdmin && (
          <button
            type="button"
            onClick={onSwitchToAdmin}
            className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md transition-colors cursor-pointer"
          >
            {locale === 'bn' ? 'সুপার অ্যাডমিন হিসেবে প্রবেশ করুন' : 'Switch to Super Admin'}
          </button>
        )}
      </div>
    );
  }

  const totalSalesPaisa = orders
    .filter((o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
    .reduce((sum, o) => sum + o.totalPaisa, 0);
  const pendingKycCount = kycSubmissions.filter((k) => k.status === 'PENDING').length;
  const pendingWdCount = withdrawals.filter((w) => w.status === 'PENDING').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-mono text-slate-500">
            RBAC Role: {ROLE_LABELS[session.role][locale]} ({session.role})
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#13204A] tracking-tight">
            {t(locale, 'adminHeading')}
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto">
          {(
            [
              ['orders', t(locale, 'adminOrdersTab')],
              ['catalogue', locale === 'bn' ? 'ক্যাটালগ' : 'Catalogue'],
              ['kyc', t(locale, 'adminKycTab')],
              ['commission', t(locale, 'adminCommissionTab')],
              ['withdrawals', t(locale, 'adminWithdrawalsTab')],
              ['marketing', locale === 'bn' ? 'ডিলার ও সিএমএস' : 'Dealers & CMS'],
              ['reports', locale === 'bn' ? 'রিপোর্ট' : 'Reports'],
              ['settings', t(locale, 'adminSettingsTab')],
              ['audit', t(locale, 'adminAuditTab')],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded whitespace-nowrap shrink-0 cursor-pointer ${
                tab === id
                  ? 'bg-white text-[#13204A] shadow-xs'
                  : 'text-slate-600 hover:text-[#13204A]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Admin KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
          <p className="text-xs text-slate-500">Gross Order Value</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#13204A]">
            {formatBDT(totalSalesPaisa, locale)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
          <p className="text-xs text-slate-500">Total Orders</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#13204A]">
            {formatNumber(orders.length, locale)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
          <p className="text-xs text-slate-500">Pending KYC Queue</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#E8892B]">
            {formatNumber(pendingKycCount, locale)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
          <p className="text-xs text-slate-500">Pending Withdrawals</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#13204A]">
            {formatNumber(pendingWdCount, locale)}
          </p>
        </div>
      </div>

      {/* Order Flow Doughnut Overview (Always visible beneath KPI strip) */}
      {renderOrderStatusDoughnut(hasPermission(session.role, 'orders:manage'))}

      {/* TAB 1: Orders State Machine */}
      {tab === 'orders' && (
        !hasPermission(session.role, 'orders:manage') ? (
          <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-6">
            {t(locale, 'permissionDenied')}
          </p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#13204A]">
                Order State Machine (DELIVERED credits PV · REFUNDED reverses PV)
              </h2>
              {orderStatusFilter !== 'ALL' && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-mono text-slate-500">
                    Filter: <strong className="text-[#13204A]">{orderStatusFilter}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('ALL')}
                    className="font-semibold text-[#E8892B] hover:underline cursor-pointer"
                  >
                    {locale === 'bn' ? 'সব অর্ডার' : 'Show all'}
                  </button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-[#F8FAFC]">
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Payment</th>
                    <th className="px-4 py-3 font-medium text-right">PV</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium text-right">Transition Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-3 font-mono font-semibold text-[#13204A]">
                        {order.id}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {order.customerName} ({order.district})
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {order.paymentMethod} · {order.paymentStatus}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        <span className={order.pvReversed ? 'text-red-600 line-through' : 'text-[#E8892B] font-semibold'}>
                          {formatPV(order.totalPv, locale)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                        {formatBDT(order.totalPaisa, locale)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <select
                          aria-label={`Change status for ${order.id}`}
                          value={order.status}
                          onChange={(e) =>
                            onUpdateOrderStatus(order.id, e.target.value as OrderStatus)
                          }
                          className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                        >
                          {ORDER_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* TAB: Catalogue & Inventory CRUD */}
      {tab === 'catalogue' && (
        !hasPermission(session.role, 'catalog:manage') ? (
          <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-6">
            {t(locale, 'permissionDenied')}
          </p>
        ) : (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[#13204A]">
                    Product Catalogue &amp; Variant Pricing ({formatNumber(products.length, locale)} Products)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Edit MRP (৳), Member Price (৳), integer PV, and stock inline. Changes reflect live in the Storefront.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const rows = products.flatMap((p) =>
                      p.variants.map((v) => [
                        v.sku,
                        p.nameEn,
                        p.categoryId,
                        v.labelEn,
                        Math.round(v.mrpPaisa / 100),
                        Math.round(v.memberPricePaisa / 100),
                        v.pv,
                        v.stock,
                      ])
                    );
                    downloadCsv(
                      'nexus-catalogue.csv',
                      ['SKU', 'Product', 'Category', 'Variant', 'MRP_BDT', 'MemberPrice_BDT', 'PV', 'Stock'],
                      rows
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#13204A] border border-slate-300 hover:border-[#13204A] rounded-md cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Catalogue CSV</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 bg-[#F8FAFC]">
                      <th className="px-4 py-3 font-medium">SKU</th>
                      <th className="px-4 py-3 font-medium">Product / Variant</th>
                      <th className="px-4 py-3 font-medium text-right">MRP (৳)</th>
                      <th className="px-4 py-3 font-medium text-right">Member (৳)</th>
                      <th className="px-4 py-3 font-medium text-right">PV</th>
                      <th className="px-4 py-3 font-medium text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.flatMap((p) =>
                      p.variants.map((v) => (
                        <tr key={v.id}>
                          <td className="px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap">{v.sku}</td>
                          <td className="px-4 py-2.5">
                            <p className="font-semibold text-[#13204A]">{p.nameEn}</p>
                            <p className="text-[11px] text-slate-500">{v.labelEn} · {p.categoryId}</p>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <input
                              type="number"
                              min={1}
                              value={Math.round(v.mrpPaisa / 100)}
                              onChange={(e) =>
                                onUpdateVariant(p.id, v.id, {
                                  mrpPaisa: Math.max(1, Number(e.target.value)) * 100,
                                })
                              }
                              className="w-20 px-2 py-1 text-right font-mono border border-slate-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <input
                              type="number"
                              min={1}
                              value={Math.round(v.memberPricePaisa / 100)}
                              onChange={(e) =>
                                onUpdateVariant(p.id, v.id, {
                                  memberPricePaisa: Math.max(1, Number(e.target.value)) * 100,
                                })
                              }
                              className="w-20 px-2 py-1 text-right font-mono border border-slate-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <input
                              type="number"
                              min={0}
                              value={v.pv}
                              onChange={(e) =>
                                onUpdateVariant(p.id, v.id, {
                                  pv: Math.max(0, Math.round(Number(e.target.value))),
                                })
                              }
                              className="w-16 px-2 py-1 text-right font-mono border border-slate-300 rounded text-[#E8892B] font-semibold"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <input
                              type="number"
                              min={0}
                              value={v.stock}
                              onChange={(e) =>
                                onUpdateVariant(p.id, v.id, {
                                  stock: Math.max(0, Math.round(Number(e.target.value))),
                                })
                              }
                              className="w-16 px-2 py-1 text-right font-mono border border-slate-300 rounded"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add New Product Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newProdNameEn.trim() || !newProdSku.trim()) return;
                const slug = newProdNameEn
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/(^-|-$)/g, '');
                const prodId = `prod-${slug}-${Date.now().toString().slice(-3)}`;
                const newProduct: Product = {
                  id: prodId,
                  slug,
                  categoryId: newProdCat,
                  brand: newProdBrand.trim() || 'Nexus Essentials',
                  nameEn: newProdNameEn.trim(),
                  nameBn: newProdNameBn.trim() || newProdNameEn.trim(),
                  shortDescEn: 'Quality assured consumer essential from Nexus Consumers Limited.',
                  shortDescBn: 'নেক্সাস কনজিউমারস লিমিটেডের মানসম্মত নিত্যপ্রয়োজনীয় পণ্য।',
                  descriptionEn: 'Added via Admin Catalogue Manager with integer paisa pricing and verified PV.',
                  descriptionBn: 'অ্যাডমিন ক্যাটালগ ম্যানেজার থেকে যুক্ত মানসম্মত পণ্য।',
                  imageUrl: CATEGORY_IMAGE_MAP[newProdCat],
                  rating: 5.0,
                  reviewCount: 0,
                  featured: false,
                  specs: [
                    { labelEn: 'Origin', labelBn: 'উৎস', valueEn: 'Bangladesh', valueBn: 'বাংলাদেশ' },
                  ],
                  reviews: [],
                  variants: [
                    {
                      id: `v-${Date.now().toString().slice(-4)}`,
                      sku: newProdSku.trim().toUpperCase(),
                      labelEn: 'Standard Pack',
                      labelBn: 'স্ট্যান্ডার্ড প্যাক',
                      mrpPaisa: Math.max(1, Number(newProdMrp) || 100) * 100,
                      memberPricePaisa: Math.max(1, Number(newProdMemberPrice) || 90) * 100,
                      pv: Math.max(0, Math.round(Number(newProdPv) || 0)),
                      stock: Math.max(0, Math.round(Number(newProdStock) || 0)),
                      weightGrams: 500,
                    },
                  ],
                };
                onAddProduct(newProduct);
                setNewProdNameEn('');
                setNewProdNameBn('');
                setNewProdSku('');
                setCatalogueMsg(`Added ${newProduct.nameEn} (${newProduct.variants[0].sku}) to storefront.`);
              }}
              className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#E8892B]" />
                <h3 className="text-sm font-bold text-[#13204A]">Add New Storefront Product</h3>
              </div>
              {catalogueMsg && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                  {catalogueMsg}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <input
                  type="text"
                  required
                  value={newProdNameEn}
                  onChange={(e) => setNewProdNameEn(e.target.value)}
                  placeholder="Product Name (English)"
                  className="px-3 py-2 border border-slate-300 rounded-md"
                />
                <input
                  type="text"
                  value={newProdNameBn}
                  onChange={(e) => setNewProdNameBn(e.target.value)}
                  placeholder="পণ্যের নাম (বাংলা)"
                  className="px-3 py-2 border border-slate-300 rounded-md"
                />
                <input
                  type="text"
                  value={newProdBrand}
                  onChange={(e) => setNewProdBrand(e.target.value)}
                  placeholder="Brand"
                  className="px-3 py-2 border border-slate-300 rounded-md"
                />
                <select
                  value={newProdCat}
                  onChange={(e) => setNewProdCat(e.target.value as Exclude<ProductCategoryId, 'all'>)}
                  className="px-3 py-2 border border-slate-300 rounded-md bg-white"
                >
                  <option value="groceries">Groceries</option>
                  <option value="personal_care">Personal Care</option>
                  <option value="household">Household</option>
                  <option value="beverages">Beverages</option>
                  <option value="fashion">Fashion</option>
                </select>
                <input
                  type="text"
                  required
                  value={newProdSku}
                  onChange={(e) => setNewProdSku(e.target.value)}
                  placeholder="SKU (e.g. NCL-NEW-01)"
                  className="px-3 py-2 font-mono border border-slate-300 rounded-md uppercase"
                />
                <input
                  type="number"
                  min={1}
                  value={newProdMrp}
                  onChange={(e) => setNewProdMrp(e.target.value)}
                  placeholder="MRP (৳)"
                  className="px-3 py-2 font-mono border border-slate-300 rounded-md"
                />
                <input
                  type="number"
                  min={1}
                  value={newProdMemberPrice}
                  onChange={(e) => setNewProdMemberPrice(e.target.value)}
                  placeholder="Member Price (৳)"
                  className="px-3 py-2 font-mono border border-slate-300 rounded-md"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    value={newProdPv}
                    onChange={(e) => setNewProdPv(e.target.value)}
                    placeholder="PV"
                    className="w-1/2 px-2.5 py-2 font-mono border border-slate-300 rounded-md"
                  />
                  <input
                    type="number"
                    min={0}
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    placeholder="Stock"
                    className="w-1/2 px-2.5 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md cursor-pointer"
              >
                Create Product
              </button>
            </form>
          </div>
        )
      )}

      {/* TAB 2: KYC Review Queue */}
      {tab === 'kyc' && (
        !hasPermission(session.role, 'kyc:review') ? (
          <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-6">
            {t(locale, 'permissionDenied')}
          </p>
        ) : (
          <div className="space-y-4">
            {kycSubmissions.map((k) => (
              <div
                key={k.id}
                className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 text-xs">
                  <p className="text-sm font-bold text-[#13204A]">
                    {k.fullName} <span className="font-mono text-slate-500">({k.memberId})</span>
                  </p>
                  <p className="text-slate-600 font-mono">
                    Masked NID: <strong>{k.maskedNid}</strong> · DOB: {k.dateOfBirth} · Status:{' '}
                    <strong>{k.status}</strong>
                  </p>
                  <p className="text-slate-500">
                    Nominee: {k.nomineeName} ({k.nomineeRelation}) · Private Vault Files:{' '}
                    <span className="font-mono">{k.nidFrontFile}</span>
                  </p>
                  {k.rejectionReason && (
                    <p className="text-red-700">Rejection reason: {k.rejectionReason}</p>
                  )}
                </div>

                {k.status === 'PENDING' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={rejectReasons[k.id] || ''}
                      onChange={(e) =>
                        setRejectReasons((prev) => ({ ...prev, [k.id]: e.target.value }))
                      }
                      placeholder="Rejection reason (if rejecting)"
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded w-48"
                    />
                    <button
                      type="button"
                      onClick={() => onReviewKyc(k.id, 'APPROVED')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded cursor-pointer"
                    >
                      {t(locale, 'approve')}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onReviewKyc(
                          k.id,
                          'REJECTED',
                          rejectReasons[k.id]?.trim() || 'NID scan unclear — please re-upload.'
                        )
                      }
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded cursor-pointer"
                    >
                      {t(locale, 'reject')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* TAB 3: Configuration-Driven Commission Engine */}
      {tab === 'commission' && (
        !hasPermission(session.role, 'commission:run') ? (
          <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-6">
            {t(locale, 'permissionDenied')}
          </p>
        ) : (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1 flex-1">
                <h2 className="text-sm font-bold text-[#13204A]">
                  Commission Period Engine (Dry-Run → Review → Approve → Post → Lock)
                </h2>
                <p className="text-xs text-slate-600">
                  Uses admin-configurable rates ({settings.referenceBonusPercent}% reference,{' '}
                  {formatBDT(settings.matchingBonusPerPvPaisa, locale)}/matched PV, {settings.tdsPercent}% TDS —{' '}
                  <strong>{t(locale, 'todoConfirmTag')}</strong>). Locked periods can never be re-run.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-md w-44"
                />
                <button
                  type="button"
                  onClick={() => onGenerateCommissionDryRun(periodLabel)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md whitespace-nowrap cursor-pointer"
                >
                  {t(locale, 'runDryRun')}
                </button>
              </div>
            </div>

            {commissionRuns.map((run) => (
              <div key={run.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold font-mono text-[#13204A]">
                      {run.id} · {run.periodLabel}
                    </p>
                    <p className="text-xs text-slate-500">
                      Status: <strong>{run.status}</strong> · Net Total:{' '}
                      <strong className="font-mono text-[#13204A]">
                        {formatBDT(run.totalNetPaisa, locale)}
                      </strong>
                    </p>
                  </div>
                  {run.status === 'DRY_RUN' && hasPermission(session.role, 'commission:approve') ? (
                    <button
                      type="button"
                      onClick={() => onApproveAndLockCommissionRun(run.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#E8892B] hover:bg-[#CF751C] rounded-md cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{t(locale, 'approveAndLock')}</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-700 font-semibold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>LOCKED (Immutable)</span>
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 bg-[#F8FAFC]">
                        <th className="px-4 py-2.5 font-medium">Member</th>
                        <th className="px-4 py-2.5 font-medium">Bonus Type</th>
                        <th className="px-4 py-2.5 font-medium">Explainable Calculation</th>
                        <th className="px-4 py-2.5 font-medium text-right">TDS</th>
                        <th className="px-4 py-2.5 font-medium text-right">Net Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {run.items.map((item, idx) => (
                        <tr key={`${run.id}-${idx}`}>
                          <td className="px-4 py-2.5 font-semibold text-[#13204A]">
                            {item.memberName} ({item.memberId})
                          </td>
                          <td className="px-4 py-2.5 font-mono">{item.bonusType}</td>
                          <td className="px-4 py-2.5 text-slate-600">{item.explanation}</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-500">
                            -{formatBDT(item.tdsPaisa, locale)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums font-bold text-emerald-700">
                            +{formatBDT(item.netPaisa, locale)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* TAB 4: Withdrawals Queue */}
      {tab === 'withdrawals' && (
        !hasPermission(session.role, 'withdrawals:approve') ? (
          <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-6">
            {t(locale, 'permissionDenied')}
          </p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-[#F8FAFC]">
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Member</th>
                    <th className="px-4 py-3 font-medium">Channel / Account</th>
                    <th className="px-4 py-3 font-medium text-right">Net Payout</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {withdrawals.map((w) => (
                    <tr key={w.id}>
                      <td className="px-4 py-3 font-mono font-semibold text-[#13204A]">{w.id}</td>
                      <td className="px-4 py-3">
                        {w.memberName} ({w.memberId})
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {w.method} · {w.accountNumber}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold">
                        {formatBDT(w.netAmountPaisa, locale)}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {w.status} {w.txReference ? `(${w.txReference})` : ''}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {w.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateWithdrawal(
                                  w.id,
                                  'PAID',
                                  `PAY-${Math.floor(100000 + Math.random() * 899999)}`
                                )
                              }
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded cursor-pointer"
                            >
                              Mark Paid
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateWithdrawal(w.id, 'REJECTED', 'Account mismatch')
                              }
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-red-700 rounded cursor-pointer"
                            >
                              {t(locale, 'reject')}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* TAB: Dealers, Promo Coupons & CMS Editor */}
      {tab === 'marketing' && (
        !hasPermission(session.role, 'settings:manage') ? (
          <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-6">
            {t(locale, 'permissionDenied')}
          </p>
        ) : (
          <div className="space-y-6">
            {/* Dealer Applications Review */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-sm font-bold text-[#13204A]">
                  Regional Dealer Applications ({formatNumber(dealerApplications.length, locale)})
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {dealerApplications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-bold text-[#13204A]">
                        {app.businessName} · <span className="font-mono">{app.id}</span>
                      </p>
                      <p className="text-slate-600">
                        {app.applicantName} ({app.mobile}) · {app.upazila}, {app.district}, {app.division}
                      </p>
                      <p className="font-mono text-slate-500">
                        Trade License: {app.tradeLicenseNo} · NID: {app.maskedNid} · Status:{' '}
                        <strong>{app.status}</strong>
                      </p>
                    </div>
                    {app.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onReviewDealerApplication(app.id, 'APPROVED')}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded cursor-pointer"
                        >
                          {t(locale, 'approve')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onReviewDealerApplication(app.id, 'REJECTED')}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded cursor-pointer"
                        >
                          {t(locale, 'reject')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Promo Coupons Manager */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-[#13204A]">Promo Coupons</h3>
                </div>
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 bg-[#F8FAFC]">
                      <th className="px-4 py-2.5 font-medium">Code</th>
                      <th className="px-4 py-2.5 font-medium">Discount</th>
                      <th className="px-4 py-2.5 font-medium">Min Order</th>
                      <th className="px-4 py-2.5 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {coupons.map((c) => (
                      <tr key={c.code}>
                        <td className="px-4 py-2.5 font-mono font-bold text-[#13204A]">{c.code}</td>
                        <td className="px-4 py-2.5 font-mono">
                          {c.type === 'PERCENT' ? `${c.value}%` : formatBDT(c.value, locale)}
                        </td>
                        <td className="px-4 py-2.5 font-mono">{formatBDT(c.minOrderPaisa, locale)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => onToggleCoupon(c.code)}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer ${
                              c.active
                                ? 'bg-emerald-700 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {c.active ? 'ACTIVE' : 'PAUSED'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const cleanCode = couponCode.trim().toUpperCase();
                  if (!cleanCode) return;
                  const valNum = Math.max(1, Math.round(Number(couponValue) || 10));
                  onAddCoupon({
                    code: cleanCode,
                    type: couponType,
                    value: couponType === 'FLAT' ? valNum * 100 : valNum,
                    minOrderPaisa: Math.max(0, Math.round(Number(couponMinTaka) || 0)) * 100,
                    active: true,
                    labelEn: couponType === 'PERCENT' ? `${valNum}% off order` : `৳${valNum} flat off`,
                    labelBn: couponType === 'PERCENT' ? `${valNum}% ছাড়` : `৳${valNum} ছাড়`,
                  });
                  setCouponCode('');
                }}
                className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs"
              >
                <h3 className="text-sm font-bold text-[#13204A]">Create Promo Coupon</h3>
                <input
                  type="text"
                  required
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Code (e.g. EID15)"
                  className="w-full px-3 py-2 font-mono uppercase border border-slate-300 rounded-md"
                />
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={couponType}
                    onChange={(e) => setCouponType(e.target.value as 'PERCENT' | 'FLAT')}
                    className="px-2 py-2 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="PERCENT">Percent (%)</option>
                    <option value="FLAT">Flat (৳)</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={couponValue}
                    onChange={(e) => setCouponValue(e.target.value)}
                    placeholder="Value"
                    className="px-2.5 py-2 font-mono border border-slate-300 rounded-md"
                  />
                  <input
                    type="number"
                    min={0}
                    value={couponMinTaka}
                    onChange={(e) => setCouponMinTaka(e.target.value)}
                    placeholder="Min (৳)"
                    className="px-2.5 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md cursor-pointer"
                >
                  Add Coupon
                </button>
              </form>
            </div>

            {/* Live CMS Policy Pages Editor */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#13204A]">
                    CMS Policy &amp; Informational Pages Editor
                  </h3>
                  <p className="text-xs text-slate-500">
                    Edits immediately update the footer legal and informational modals.
                  </p>
                </div>
                <select
                  value={selectedCmsKey}
                  onChange={(e) => {
                    const key = e.target.value as CmsPageKey;
                    setSelectedCmsKey(key);
                    setCmsDraftBody(cmsContent[key].body);
                    setCmsSavedMsg('');
                  }}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                >
                  {(Object.keys(cmsContent) as CmsPageKey[]).map((key) => (
                    <option key={key} value={key}>
                      {cmsContent[key].titleEn}
                    </option>
                  ))}
                </select>
              </div>
              {cmsSavedMsg && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                  {cmsSavedMsg}
                </p>
              )}
              <textarea
                rows={5}
                value={cmsDraftBody}
                onChange={(e) => setCmsDraftBody(e.target.value)}
                className="w-full px-3 py-2 text-xs font-sans border border-slate-300 rounded-md leading-relaxed"
              />
              <button
                type="button"
                onClick={() => {
                  onUpdateCmsPage(selectedCmsKey, cmsDraftBody);
                  setCmsSavedMsg(`Updated "${cmsContent[selectedCmsKey].titleEn}" content.`);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md cursor-pointer"
              >
                Save CMS Page
              </button>
            </div>
          </div>
        )
      )}

      {/* TAB: Reports & CSV Exports */}
      {tab === 'reports' && (
        !hasPermission(session.role, 'audit:view') ? (
          <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-6">
            {t(locale, 'permissionDenied')}
          </p>
        ) : (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[#13204A]">
                    Financial &amp; Operations CSV Exports
                  </h2>
                  <p className="text-xs text-slate-500">
                    All currency values exported in BDT with full audit provenance.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadCsv(
                        'nexus-sales-report.csv',
                        ['OrderID', 'Date', 'Customer', 'District', 'Channel', 'Payment', 'Status', 'Total_BDT', 'Total_PV'],
                        orders.map((o) => [
                          o.id,
                          o.createdAt.slice(0, 10),
                          o.customerName,
                          o.district,
                          o.channel,
                          o.paymentMethod,
                          o.status,
                          (o.totalPaisa / 100).toFixed(2),
                          o.totalPv,
                        ])
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Sales CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadCsv(
                        'nexus-withdrawals-report.csv',
                        ['WithdrawalID', 'Date', 'MemberID', 'MemberName', 'Method', 'Account', 'Gross_BDT', 'Fee_BDT', 'Net_BDT', 'Status'],
                        withdrawals.map((w) => [
                          w.id,
                          w.createdAt.slice(0, 10),
                          w.memberId,
                          w.memberName,
                          w.method,
                          w.accountNumber,
                          (w.grossAmountPaisa / 100).toFixed(2),
                          (w.feePaisa / 100).toFixed(2),
                          (w.netAmountPaisa / 100).toFixed(2),
                          w.status,
                        ])
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#13204A] border border-slate-300 hover:border-[#13204A] rounded-md cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Withdrawals CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadCsv(
                        'nexus-commission-ledger.csv',
                        ['LedgerID', 'Date', 'MemberID', 'Type', 'Amount_BDT', 'RuleSummary'],
                        ledger.map((l) => [
                          l.id,
                          l.createdAt.slice(0, 10),
                          l.memberId,
                          l.type,
                          (l.amountPaisa / 100).toFixed(2),
                          l.ruleSummary,
                        ])
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#13204A] border border-slate-300 hover:border-[#13204A] rounded-md cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Commission Ledger CSV</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <h3 className="text-sm font-bold text-[#13204A]">Revenue by Product Category</h3>
              <div className="space-y-3">
                {categorySalesBreakdown.map((row) => (
                  <div key={row.cat} className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-700 capitalize">
                        {row.cat.replace('_', ' ')}
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-[#13204A]">
                        {formatBDT(row.amountPaisa, locale)}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-[#13204A]"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">Registered Network Members</span>
                <span className="font-mono tabular-nums font-bold text-[#E8892B]">
                  {formatNumber(Object.keys(members).length, locale)}
                </span>
              </div>
            </div>
          </div>
        )
      )}

      {/* TAB 5: Admin-Editable Business Settings (Zero hard-coded rules) */}
      {tab === 'settings' && (
        !hasPermission(session.role, 'settings:manage') ? (
          <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-6">
            {t(locale, 'permissionDenied')}
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSaveSettings(draftSettings);
              setSettingsSavedMsg('Settings updated and logged to Audit Trail.');
            }}
            className="bg-white border border-slate-200 rounded-lg p-6 space-y-6"
          >
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#13204A]">
                Configurable Business Rules ({t(locale, 'todoConfirmTag')})
              </h2>
              <p className="text-xs text-slate-600">
                All monetary values are persisted internally as integer paisa. Editing values here updates Checkout, Wallet Withdrawals, and Commission Dry-Runs immediately.
              </p>
            </div>

            {settingsSavedMsg && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                {settingsSavedMsg}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <label className="space-y-1 block">
                <span className="font-medium text-slate-700">Inside Dhaka Delivery (৳)</span>
                <input
                  type="number"
                  value={Math.round(draftSettings.deliveryInsideDhakaPaisa / 100)}
                  onChange={(e) =>
                    setDraftSettings({
                      ...draftSettings,
                      deliveryInsideDhakaPaisa: Math.max(0, Number(e.target.value)) * 100,
                    })
                  }
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                />
              </label>

              <label className="space-y-1 block">
                <span className="font-medium text-slate-700">Outside Dhaka Delivery (৳)</span>
                <input
                  type="number"
                  value={Math.round(draftSettings.deliveryOutsideDhakaPaisa / 100)}
                  onChange={(e) =>
                    setDraftSettings({
                      ...draftSettings,
                      deliveryOutsideDhakaPaisa: Math.max(0, Number(e.target.value)) * 100,
                    })
                  }
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                />
              </label>

              <label className="space-y-1 block">
                <span className="font-medium text-slate-700">Free Delivery Threshold (৳)</span>
                <input
                  type="number"
                  value={Math.round(draftSettings.freeDeliveryThresholdPaisa / 100)}
                  onChange={(e) =>
                    setDraftSettings({
                      ...draftSettings,
                      freeDeliveryThresholdPaisa: Math.max(0, Number(e.target.value)) * 100,
                    })
                  }
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                />
              </label>

              <label className="space-y-1 block">
                <span className="font-medium text-slate-700">Min Withdrawal (৳)</span>
                <input
                  type="number"
                  value={Math.round(draftSettings.minWithdrawalPaisa / 100)}
                  onChange={(e) =>
                    setDraftSettings({
                      ...draftSettings,
                      minWithdrawalPaisa: Math.max(0, Number(e.target.value)) * 100,
                    })
                  }
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                />
              </label>

              <label className="space-y-1 block">
                <span className="font-medium text-slate-700">Withdrawal Fee (%)</span>
                <input
                  type="number"
                  value={draftSettings.withdrawalFeePercent}
                  onChange={(e) =>
                    setDraftSettings({
                      ...draftSettings,
                      withdrawalFeePercent: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                />
              </label>

              <label className="space-y-1 block">
                <span className="font-medium text-slate-700">Commission TDS (%)</span>
                <input
                  type="number"
                  value={draftSettings.tdsPercent}
                  onChange={(e) =>
                    setDraftSettings({
                      ...draftSettings,
                      tdsPercent: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                />
              </label>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Configured Ranks: {ranks.map((r) => r.code).join(' → ')}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onResetDemoData();
                    setSettingsSavedMsg('Demo dataset restored to initial seed defaults.');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 border border-slate-300 hover:border-[#13204A] rounded-md cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Demo Data</span>
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md cursor-pointer"
                >
                  {t(locale, 'saveSettings')}
                </button>
              </div>
            </div>
          </form>
        )
      )}

      {/* TAB 6: Immutable Audit Log */}
      {tab === 'audit' && (
        !hasPermission(session.role, 'audit:view') ? (
          <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-6">
            {t(locale, 'permissionDenied')}
          </p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-[#F8FAFC]">
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 font-medium">Actor / Role</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Entity</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                        {log.at.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-[#13204A]">{log.actorName}</span>{' '}
                        <span className="font-mono text-slate-500">({log.actorRole})</span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {log.entityType}:{log.entityId}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
