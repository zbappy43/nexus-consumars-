import { useMemo, useState } from 'react';
import { CheckCircle2, PackagePlus, Printer, Store } from 'lucide-react';
import type {
  AuthSession,
  DealerApplication,
  DealerRequisition,
  DealerStockItem,
  Locale,
  MemberNode,
  Order,
  OrderStatus,
  SiteSettings,
} from '../types/domain';
import { BD_DIVISIONS } from '../data/bdLocations';
import { t } from '../lib/i18n';
import {
  calculatePercentagePaisa,
  formatBDT,
  formatNumber,
  formatPV,
} from '../lib/money';
import { hasPermission } from '../lib/rbac';
import { maskNid, validateBdMobile } from '../lib/security';

interface DealerPortalViewProps {
  locale: Locale;
  session: AuthSession;
  stock: DealerStockItem[];
  requisitions: DealerRequisition[];
  orders: Order[];
  members: Record<string, MemberNode>;
  settings: SiteSettings;
  onSubmitRequisition: (sku: string, productName: string, qty: number) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onCompletePosSale: (memberId: string, variantId: string, qty: number) => string | null;
  onSubmitDealerApplication: (app: DealerApplication) => void;
  onTrackOrder: (orderId: string) => void;
}

export function DealerPortalView({
  locale,
  session,
  stock,
  requisitions,
  orders,
  members,
  settings,
  onSubmitRequisition,
  onUpdateOrderStatus,
  onCompletePosSale,
  onSubmitDealerApplication,
  onTrackOrder,
}: DealerPortalViewProps) {
  const [tab, setTab] = useState<'stock' | 'orders' | 'pos' | 'ledger'>('stock');
  const [reqSku, setReqSku] = useState(stock[0]?.sku || '');
  const [reqQty, setReqQty] = useState('20');
  const [posMemberId, setPosMemberId] = useState('NCL-100001');
  const [posVariantId, setPosVariantId] = useState(stock[0]?.variantId || '');
  const [posQty, setPosQty] = useState('1');
  const [feedback, setFeedback] = useState('');

  // Dealer application state (for non-dealers)
  const [businessName, setBusinessName] = useState('');
  const [tradeLicenseNo, setTradeLicenseNo] = useState('');
  const [applicantNid, setApplicantNid] = useState('');
  const [applicantMobile, setApplicantMobile] = useState(session.mobile || '01711223344');
  const [divId, setDivId] = useState('dhaka');
  const [distId, setDistId] = useState('kishoreganj');
  const [upzId, setUpzId] = useState('kishoreganj-sadar');
  const [appSubmittedMsg, setAppSubmittedMsg] = useState('');

  const canAccess = hasPermission(session.role, 'dealer:portal');

  const assignedOrders = useMemo(
    () => orders.filter((o) => o.assignedDealerId === 'DLR-KISH-01' || o.channel === 'DEALER_POS'),
    [orders]
  );

  const deliveredDealerSalesPaisa = useMemo(
    () =>
      assignedOrders
        .filter((o) => o.status === 'DELIVERED')
        .reduce((sum, o) => sum + o.subtotalPaisa, 0),
    [assignedOrders]
  );

  const dealerCommissionPaisa = calculatePercentagePaisa(
    deliveredDealerSalesPaisa,
    settings.dealerCommissionPercent
  );

  const activeDiv = BD_DIVISIONS.find((d) => d.id === divId) ?? BD_DIVISIONS[0];
  const activeDist = activeDiv.districts.find((d) => d.id === distId) ?? activeDiv.districts[0];
  const activeUpz = activeDist.upazilas.find((u) => u.id === upzId) ?? activeDist.upazilas[0];

  if (!canAccess) {
    const handleApplyDealer = (e: React.FormEvent) => {
      e.preventDefault();
      if (!businessName.trim() || !tradeLicenseNo.trim() || applicantNid.replace(/\D/g, '').length < 10) {
        setAppSubmittedMsg(
          locale === 'bn'
            ? 'ব্যবসার নাম, ট্রেড লাইসেন্স এবং সঠিক এনআইডি নম্বর দিন।'
            : 'Please enter business name, trade license number, and a valid NID number.'
        );
        return;
      }
      if (!validateBdMobile(applicantMobile)) {
        setAppSubmittedMsg('Enter a valid Bangladesh mobile number.');
        return;
      }
      const application: DealerApplication = {
        id: `DAPP-${Math.floor(502 + Math.random() * 490)}`,
        applicantName: session.name || 'Dealer Applicant',
        mobile: applicantMobile.trim(),
        businessName: businessName.trim(),
        tradeLicenseNo: tradeLicenseNo.trim(),
        maskedNid: maskNid(applicantNid),
        division: activeDiv.en,
        district: activeDist.en,
        upazila: activeUpz.en,
        status: 'PENDING',
        submittedAt: new Date().toISOString(),
      };
      onSubmitDealerApplication(application);
      setBusinessName('');
      setTradeLicenseNo('');
      setApplicantNid('');
      setAppSubmittedMsg(
        `Dealer application ${application.id} submitted (${application.maskedNid}) — queued in Admin Panel for review.`
      );
    };

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#E8892B]">
            <Store className="w-4 h-4" />
            <span>Regional Stock Point Program</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#13204A]">
            {locale === 'bn' ? 'আঞ্চলিক ডিলার / এজেন্ট আবেদন' : 'Apply as a Regional Dealer / Agent'}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Operate a Nexus Consumers regional stock point in your Upazila or District, fulfil local orders, run walk-in Member POS, and earn dealer commission. (To preview an active dealer portal right now, switch Session Role to <strong>Regional Dealer</strong> above.)
          </p>
        </div>

        <form
          onSubmit={handleApplyDealer}
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
        >
          {appSubmittedMsg && (
            <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded p-3">
              {appSubmittedMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1 text-xs block">
              <span className="font-medium text-slate-700">Business / Enterprise Name</span>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Karimganj Nexus Point"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </label>
            <label className="space-y-1 text-xs block">
              <span className="font-medium text-slate-700">Trade License Number</span>
              <input
                type="text"
                required
                value={tradeLicenseNo}
                onChange={(e) => setTradeLicenseNo(e.target.value)}
                placeholder="TRAD/KISH/2026-XXXX"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1 text-xs block">
              <span className="font-medium text-slate-700">Proprietor NID (Encrypted &amp; Masked)</span>
              <input
                type="text"
                required
                value={applicantNid}
                onChange={(e) => setApplicantNid(e.target.value)}
                placeholder="1990481234567"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </label>
            <label className="space-y-1 text-xs block">
              <span className="font-medium text-slate-700">Business Mobile</span>
              <input
                type="tel"
                required
                value={applicantMobile}
                onChange={(e) => setApplicantMobile(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <label className="space-y-1 block">
              <span className="font-medium text-slate-700">{t(locale, 'division')}</span>
              <select
                value={divId}
                onChange={(e) => {
                  const nd = BD_DIVISIONS.find((x) => x.id === e.target.value) ?? BD_DIVISIONS[0];
                  setDivId(nd.id);
                  setDistId(nd.districts[0].id);
                  setUpzId(nd.districts[0].upazilas[0].id);
                }}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-md bg-white"
              >
                {BD_DIVISIONS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {locale === 'bn' ? d.bn : d.en}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="font-medium text-slate-700">{t(locale, 'district')}</span>
              <select
                value={activeDist.id}
                onChange={(e) => {
                  const nd = activeDiv.districts.find((x) => x.id === e.target.value) ?? activeDiv.districts[0];
                  setDistId(nd.id);
                  setUpzId(nd.upazilas[0].id);
                }}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-md bg-white"
              >
                {activeDiv.districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {locale === 'bn' ? d.bn : d.en}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="font-medium text-slate-700">{t(locale, 'upazila')}</span>
              <select
                value={activeUpz.id}
                onChange={(e) => setUpzId(e.target.value)}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-md bg-white"
              >
                {activeDist.upazilas.map((u) => (
                  <option key={u.id} value={u.id}>
                    {locale === 'bn' ? u.bn : u.en}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md cursor-pointer"
          >
            Submit Dealer Application
          </button>
        </form>
      </div>
    );
  }

  const matchedMember = members[posMemberId.trim().toUpperCase()];
  const selectedPosItem = stock.find((s) => s.variantId === posVariantId) ?? stock[0];

  const handleReqSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const item = stock.find((s) => s.sku === reqSku);
    const qty = Number(reqQty);
    if (!item || !Number.isFinite(qty) || qty <= 0) return;
    onSubmitRequisition(item.sku, item.productNameEn, Math.trunc(qty));
    setFeedback(`Requisition submitted to Central Warehouse for ${qty} × ${item.sku}.`);
  };

  const handlePosSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Math.max(1, Math.trunc(Number(posQty) || 1));
    const err = onCompletePosSale(posMemberId.trim().toUpperCase(), posVariantId, qty);
    if (err) {
      setFeedback(err);
    } else {
      setFeedback(
        `Walk-in POS sale completed for ${posMemberId.toUpperCase()} — dealer stock deducted and member PV credited immediately.`
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-mono text-slate-500">
            DLR-KISH-01 · Kishoreganj Sadar Regional Stock Point
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#13204A] tracking-tight">
            {t(locale, 'dealerHeading')}
          </h1>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto">
          {(
            [
              ['stock', 'dealerStockTab'],
              ['orders', 'dealerOrdersTab'],
              ['pos', 'dealerPosTab'],
              ['ledger', 'dealerLedgerTab'],
            ] as const
          ).map(([id, key]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setFeedback('');
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded whitespace-nowrap shrink-0 cursor-pointer ${
                tab === id
                  ? 'bg-white text-[#13204A] shadow-xs'
                  : 'text-slate-600 hover:text-[#13204A]'
              }`}
            >
              {t(locale, key)}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-md px-4 py-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* TAB 1: Dealer Stock & Requisitions */}
      {tab === 'stock' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-bold text-[#13204A]">Local Stock Point Inventory</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-[#F8FAFC]">
                    <th className="px-4 py-3 font-medium">SKU / Product</th>
                    <th className="px-4 py-3 font-medium text-right">Member Price</th>
                    <th className="px-4 py-3 font-medium text-right">PV</th>
                    <th className="px-4 py-3 font-medium text-right">Stock</th>
                    <th className="px-4 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stock.map((item) => {
                    const low = item.quantity <= item.reorderThreshold;
                    return (
                      <tr key={item.variantId}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#13204A]">
                            {locale === 'bn' ? item.productNameBn : item.productNameEn}
                          </p>
                          <p className="font-mono text-slate-500">
                            {item.sku} · {item.variantLabel}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {formatBDT(item.memberPricePaisa, locale)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-[#E8892B]">
                          +{formatPV(item.pv, locale)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-bold">
                          {formatNumber(item.quantity, locale)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            low ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          {low ? 'Low Stock' : 'Healthy'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <form
              onSubmit={handleReqSubmit}
              className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-[#13204A]" />
                <h3 className="text-sm font-bold text-[#13204A]">{t(locale, 'requestStock')}</h3>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 block">Product SKU</label>
                <select
                  value={reqSku}
                  onChange={(e) => setReqSku(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
                >
                  {stock.map((s) => (
                    <option key={s.sku} value={s.sku}>
                      {s.sku} — {s.productNameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 block">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={reqQty}
                  onChange={(e) => setReqQty(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-xs font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md cursor-pointer"
              >
                {t(locale, 'requestStock')}
              </button>
            </form>

            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <h4 className="text-xs font-bold text-[#13204A]">Recent Requisitions</h4>
              <ul className="divide-y divide-slate-100 text-xs">
                {requisitions.map((r) => (
                  <li key={r.id} className="py-2 flex justify-between gap-2">
                    <div>
                      <p className="font-mono font-semibold text-slate-800">{r.sku}</p>
                      <p className="text-slate-500">Qty: {r.requestedQty}</p>
                    </div>
                    <span className="font-mono font-semibold text-[#13204A]">{r.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Area Assigned Orders */}
      {tab === 'orders' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-[#13204A]">
              Assigned Area Orders (Stepwise Fulfilment: Pack → Ship → Deliver)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-[#F8FAFC]">
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer / Area</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">PV</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Fulfilment Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignedOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-mono font-semibold text-[#13204A]">
                      {order.id} · {order.channel}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {order.customerName} ({order.upazila}, {order.district})
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">{order.status}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-[#E8892B]">
                      +{formatPV(order.totalPv, locale)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                      {formatBDT(order.totalPaisa, locale)}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onTrackOrder(order.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#13204A] border border-slate-300 rounded cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Invoice</span>
                      </button>

                      {order.status === 'PENDING' || order.status === 'CONFIRMED' ? (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateOrderStatus(order.id, 'PROCESSING');
                            setFeedback(`Order ${order.id} accepted and moved to PROCESSING.`);
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold text-[#13204A] border border-[#13204A] rounded cursor-pointer"
                        >
                          Pack
                        </button>
                      ) : null}

                      {order.status === 'PROCESSING' ? (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateOrderStatus(order.id, 'SHIPPED');
                            setFeedback(`Order ${order.id} handed over to rider (SHIPPED).`);
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold text-[#13204A] border border-[#13204A] rounded cursor-pointer"
                        >
                          Hand Over
                        </button>
                      ) : null}

                      {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && order.status !== 'REFUNDED' ? (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateOrderStatus(order.id, 'DELIVERED');
                            setFeedback(`Order ${order.id} marked DELIVERED and PV credited.`);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded cursor-pointer"
                        >
                          {t(locale, 'markDelivered')}
                        </button>
                      ) : (
                        <span className="font-mono text-emerald-700 font-semibold">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Walk-in Member POS */}
      {tab === 'pos' && (
        <div className="max-w-xl bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-[#13204A]">{t(locale, 'dealerPosTab')}</h2>
            <p className="text-xs text-slate-600 mt-1">
              Place an over-the-counter sale for a walk-in member. Stock deducts from your local point and PV credits directly to the member.
            </p>
          </div>

          <form onSubmit={handlePosSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 block">
                {t(locale, 'posMemberId')}
              </label>
              <input
                type="text"
                required
                value={posMemberId}
                onChange={(e) => setPosMemberId(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-md"
              />
              <p className={`text-xs ${matchedMember ? 'text-emerald-700 font-medium' : 'text-red-600'}`}>
                {matchedMember
                  ? `Verified Member: ${matchedMember.name} (${matchedMember.rankCode})`
                  : 'Member ID not found'}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 block">Product Variant</label>
              <select
                value={posVariantId}
                onChange={(e) => setPosVariantId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
              >
                {stock.map((s) => (
                  <option key={s.variantId} value={s.variantId}>
                    {s.productNameEn} ({s.variantLabel}) — Stock: {s.quantity} — {formatBDT(s.memberPricePaisa, locale)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 block">{t(locale, 'quantity')}</label>
              <input
                type="number"
                min={1}
                max={selectedPosItem?.quantity || 1}
                value={posQty}
                onChange={(e) => setPosQty(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>

            {selectedPosItem && (
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-md p-3.5 text-xs space-y-1 font-mono tabular-nums">
                <div className="flex justify-between">
                  <span>Member Payable</span>
                  <span className="font-bold text-[#13204A]">
                    {formatBDT(selectedPosItem.memberPricePaisa * Math.max(1, Number(posQty) || 1), locale)}
                  </span>
                </div>
                <div className="flex justify-between text-[#E8892B] font-semibold">
                  <span>Member PV Earned</span>
                  <span>+{formatPV(selectedPosItem.pv * Math.max(1, Number(posQty) || 1), locale)}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!matchedMember}
              className="w-full py-2.5 text-sm font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] disabled:bg-slate-300 rounded-md cursor-pointer"
            >
              {t(locale, 'completePosSale')}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: Dealer Commission Summary */}
      {tab === 'ledger' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-1">
            <p className="text-xs text-slate-500">Delivered Sales Volume</p>
            <p className="text-xl font-bold font-mono tabular-nums text-[#13204A]">
              {formatBDT(deliveredDealerSalesPaisa, locale)}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-1">
            <p className="text-xs text-slate-500">
              Commission Rate ({t(locale, 'todoConfirmTag')})
            </p>
            <p className="text-xl font-bold font-mono tabular-nums text-[#13204A]">
              {settings.dealerCommissionPercent}%
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-1">
            <p className="text-xs text-slate-500">Accrued Dealer Commission</p>
            <p className="text-xl font-bold font-mono tabular-nums text-emerald-700">
              {formatBDT(dealerCommissionPaisa, locale)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
