import { useMemo, useState } from 'react';
import { CheckCircle2, Minus, Plus, Trash2, X } from 'lucide-react';
import type {
  AuthSession,
  CartItem,
  Coupon,
  Locale,
  Order,
  OrderItemSnapshot,
  PaymentMethod,
  Product,
  SavedAddress,
  SiteSettings,
} from '../types/domain';
import { BD_DIVISIONS } from '../data/bdLocations';
import { t } from '../lib/i18n';
import {
  calculateCouponDiscountPaisa,
  calculateDeliveryChargePaisa,
  formatBDT,
  formatNumber,
  formatPV,
  isMemberPricingEligible,
} from '../lib/money';
import { createIdempotencyKey, validateBdMobile } from '../lib/security';
import { ResilientImage } from './ResilientImage';

interface CartCheckoutDrawerProps {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  cart: CartItem[];
  products: Product[];
  coupons: Coupon[];
  savedAddresses: SavedAddress[];
  settings: SiteSettings;
  session: AuthSession;
  onUpdateQty: (productId: string, variantId: string, qty: number) => void;
  onRemoveItem: (productId: string, variantId: string) => void;
  onPlaceOrder: (order: Order) => void;
  onTrackOrder: (orderId: string) => void;
}

export function CartCheckoutDrawer({
  open,
  onClose,
  locale,
  cart,
  products,
  coupons,
  savedAddresses,
  settings,
  session,
  onUpdateQty,
  onRemoveItem,
  onPlaceOrder,
  onTrackOrder,
}: CartCheckoutDrawerProps) {
  const [step, setStep] = useState<'bag' | 'checkout' | 'confirmed'>('bag');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');

  // Checkout form state
  const [customerName, setCustomerName] = useState(session.name || '');
  const [customerPhone, setCustomerPhone] = useState(session.mobile || '01711223344');
  const [divisionId, setDivisionId] = useState('dhaka');
  const [districtId, setDistrictId] = useState('kishoreganj');
  const [upazilaId, setUpazilaId] = useState('kishoreganj-sadar');
  const [addressLine, setAddressLine] = useState('103, New Town, Kishoreganj Sadar');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [formError, setFormError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const memberEligible = isMemberPricingEligible(session.role, session.kycStatus === 'APPROVED');

  const resolvedItems = useMemo(() => {
    return cart
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        const variant = product?.variants.find((v) => v.id === item.variantId);
        if (!product || !variant) return null;
        const unitChargedPaisa = memberEligible ? variant.memberPricePaisa : variant.mrpPaisa;
        return {
          item,
          product,
          variant,
          unitChargedPaisa,
          lineTotalPaisa: unitChargedPaisa * item.quantity,
          linePv: variant.pv * item.quantity,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [cart, products, memberEligible]);

  const activeDivision = BD_DIVISIONS.find((d) => d.id === divisionId) ?? BD_DIVISIONS[0];
  const activeDistrict =
    activeDivision.districts.find((d) => d.id === districtId) ?? activeDivision.districts[0];
  const activeUpazila =
    activeDistrict.upazilas.find((u) => u.id === upazilaId) ?? activeDistrict.upazilas[0];

  const subtotalPaisa = resolvedItems.reduce((sum, r) => sum + r.lineTotalPaisa, 0);
  const totalPv = resolvedItems.reduce((sum, r) => sum + r.linePv, 0);
  const discountPaisa = calculateCouponDiscountPaisa(subtotalPaisa, appliedCoupon);
  const deliveryChargePaisa =
    resolvedItems.length > 0
      ? calculateDeliveryChargePaisa(activeDistrict.en, subtotalPaisa - discountPaisa, settings)
      : 0;
  const totalPaisa = Math.max(0, subtotalPaisa - discountPaisa + deliveryChargePaisa);
  const remainingForFreeDelivery = Math.max(
    0,
    settings.freeDeliveryThresholdPaisa - (subtotalPaisa - discountPaisa)
  );

  if (!open) return null;

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    const match = coupons.find((c) => c.code === code && c.active);
    if (!match) {
      setCouponError(locale === 'bn' ? 'সঠিক কুপন কোড নয়।' : 'Invalid coupon code.');
      setAppliedCoupon(null);
      return;
    }
    if (subtotalPaisa < match.minOrderPaisa) {
      setCouponError(
        locale === 'bn'
          ? `সর্বনিম্ন অর্ডার ${formatBDT(match.minOrderPaisa, locale)} প্রয়োজন।`
          : `Minimum order ${formatBDT(match.minOrderPaisa, locale)} required.`
      );
      return;
    }
    setAppliedCoupon(match);
    setCouponError('');
  };

  const handleDivisionChange = (newDivId: string) => {
    setDivisionId(newDivId);
    const nextDiv = BD_DIVISIONS.find((d) => d.id === newDivId) ?? BD_DIVISIONS[0];
    const nextDist = nextDiv.districts[0];
    setDistrictId(nextDist.id);
    setUpazilaId(nextDist.upazilas[0].id);
  };

  const handleDistrictChange = (newDistId: string) => {
    setDistrictId(newDistId);
    const nextDist =
      activeDivision.districts.find((d) => d.id === newDistId) ?? activeDivision.districts[0];
    setUpazilaId(nextDist.upazilas[0].id);
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !addressLine.trim()) {
      setFormError(
        locale === 'bn'
          ? 'দয়া করে আপনার নাম ও সম্পূর্ণ ঠিকানা লিখুন।'
          : 'Please enter your full name and delivery address.'
      );
      return;
    }
    if (!validateBdMobile(customerPhone)) {
      setFormError(
        locale === 'bn'
          ? 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন 017XXXXXXXX)।'
          : 'Please enter a valid Bangladesh mobile number (e.g. 017XXXXXXXX).'
      );
      return;
    }

    const orderNumber = `NCL-2026-${Math.floor(1003 + Math.random() * 8990)}`;
    const nowIso = new Date().toISOString();
    const snapshots: OrderItemSnapshot[] = resolvedItems.map((r) => ({
      productId: r.product.id,
      variantId: r.variant.id,
      sku: r.variant.sku,
      nameEn: r.product.nameEn,
      nameBn: r.product.nameBn,
      variantLabelEn: r.variant.labelEn,
      variantLabelBn: r.variant.labelBn,
      quantity: r.item.quantity,
      unitMrpPaisa: r.variant.mrpPaisa,
      unitMemberPricePaisa: r.variant.memberPricePaisa,
      unitChargedPaisa: r.unitChargedPaisa,
      unitPv: r.variant.pv,
    }));

    const isSandboxGateway = paymentMethod !== 'COD';
    const newOrder: Order = {
      id: orderNumber,
      idempotencyKey: createIdempotencyKey('ord'),
      createdAt: nowIso,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      memberId: session.memberId,
      buyerRole: session.role,
      division: activeDivision.en,
      district: activeDistrict.en,
      upazila: activeUpazila.en,
      addressLine: addressLine.trim(),
      paymentMethod,
      paymentStatus: isSandboxGateway ? 'SANDBOX_VERIFIED' : 'UNPAID',
      gatewayTxId: isSandboxGateway
        ? `${paymentMethod}-SBX-${Math.floor(100000 + Math.random() * 900000)}`
        : undefined,
      status: isSandboxGateway ? 'CONFIRMED' : 'PENDING',
      assignedDealerId: activeDistrict.id === 'kishoreganj' ? 'DLR-KISH-01' : undefined,
      channel: 'STOREFRONT',
      couponCode: appliedCoupon?.code,
      subtotalPaisa,
      discountPaisa,
      deliveryChargePaisa,
      totalPaisa,
      totalPv,
      pvCredited: false,
      pvReversed: false,
      items: snapshots,
      history: [
        {
          status: isSandboxGateway ? 'CONFIRMED' : 'PENDING',
          at: nowIso,
          actor: 'Storefront Checkout',
          note: isSandboxGateway
            ? `Payment verified via ${paymentMethod} sandbox callback (idempotent)`
            : 'Order placed with Cash on Delivery (COD)',
        },
      ],
    };

    onPlaceOrder(newOrder);
    setConfirmedOrder(newOrder);
    setFormError('');
    setStep('confirmed');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={t(locale, 'yourBag')}
    >
      <div className="bg-white w-full max-w-lg h-full flex flex-col border-l border-slate-200 shadow-2xl">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#13204A]">
            {step === 'bag'
              ? t(locale, 'yourBag')
              : step === 'checkout'
              ? t(locale, 'checkoutTitle')
              : t(locale, 'orderConfirmedTitle')}
          </h2>
          <button
            type="button"
            onClick={() => {
              setStep('bag');
              onClose();
            }}
            className="p-1.5 text-slate-500 hover:text-[#13204A] rounded cursor-pointer"
            aria-label={t(locale, 'close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'confirmed' && confirmedOrder ? (
            <div className="space-y-6 py-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-[#13204A]">
                    {t(locale, 'orderConfirmedTitle')} —{' '}
                    <span className="font-mono">{confirmedOrder.id}</span>
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {t(locale, 'orderConfirmedSubtitle')}
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-md p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t(locale, 'fullName')}</span>
                  <span className="font-medium text-slate-900">{confirmedOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t(locale, 'paymentMethod')}</span>
                  <span className="font-mono font-medium text-slate-900">
                    {confirmedOrder.paymentMethod}
                    {confirmedOrder.gatewayTxId ? ` (${confirmedOrder.gatewayTxId})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t(locale, 'totalPayable')}</span>
                  <span className="font-mono tabular-nums font-bold text-[#13204A]">
                    {formatBDT(confirmedOrder.totalPaisa, locale)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-500">{t(locale, 'totalPvEarned')}</span>
                  <span className="font-mono tabular-nums font-semibold text-[#E8892B]">
                    +{formatPV(confirmedOrder.totalPv, locale)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const id = confirmedOrder.id;
                    setStep('bag');
                    onClose();
                    onTrackOrder(id);
                  }}
                  className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md cursor-pointer"
                >
                  {t(locale, 'trackThisOrder')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('bag');
                    onClose();
                  }}
                  className="py-2.5 px-4 text-sm font-semibold text-[#13204A] border border-slate-300 rounded-md cursor-pointer"
                >
                  {t(locale, 'continueShopping')}
                </button>
              </div>
            </div>
          ) : resolvedItems.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <p className="text-sm text-slate-600">{t(locale, 'emptyBag')}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#13204A] rounded-md cursor-pointer"
              >
                {t(locale, 'continueShopping')}
              </button>
            </div>
          ) : step === 'bag' ? (
            <>
              {/* Free Delivery Progress */}
              {remainingForFreeDelivery > 0 && (
                <div className="text-xs text-slate-600 bg-[#F8FAFC] border border-slate-200 rounded-md px-3.5 py-2.5">
                  {t(locale, 'freeDeliveryHint')}{' '}
                  <span className="font-mono tabular-nums font-semibold text-[#13204A]">
                    {formatBDT(remainingForFreeDelivery, locale)}
                  </span>
                </div>
              )}

              {/* Cart Items */}
              <ul className="divide-y divide-slate-200">
                {resolvedItems.map(({ item, product, variant, unitChargedPaisa, lineTotalPaisa }) => (
                  <li key={`${item.productId}-${item.variantId}`} className="py-4 flex gap-4">
                    <div className="w-16 h-16 rounded border border-slate-200 overflow-hidden shrink-0 bg-[#F1F5F9]">
                      <ResilientImage
                        src={product.imageUrl}
                        alt={locale === 'bn' ? product.nameBn : product.nameEn}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[#13204A] truncate">
                          {locale === 'bn' ? product.nameBn : product.nameEn}
                        </p>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.productId, item.variantId)}
                          className="text-slate-400 hover:text-red-600 cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">
                        {locale === 'bn' ? variant.labelBn : variant.labelEn} ·{' '}
                        <span className="font-mono text-[#E8892B]">
                          +{formatPV(variant.pv * item.quantity, locale)}
                        </span>
                      </p>
                      <div className="flex items-center justify-between pt-1.5">
                        <div className="inline-flex items-center border border-slate-300 rounded">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.productId, item.variantId, item.quantity - 1)}
                            className="p-1 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-xs font-mono tabular-nums font-semibold">
                            {formatNumber(item.quantity, locale)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.productId, item.variantId, item.quantity + 1)}
                            className="p-1 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold font-mono tabular-nums text-[#13204A]">
                            {formatBDT(lineTotalPaisa, locale)}
                          </p>
                          <p className="text-[11px] font-mono tabular-nums text-slate-400">
                            {formatBDT(unitChargedPaisa, locale)} ea
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Coupon Input */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder={t(locale, 'couponPlaceholder')}
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-md uppercase focus:outline-none focus:border-[#13204A]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 text-xs font-semibold text-[#13204A] border border-[#13204A] hover:bg-[#13204A] hover:text-white rounded-md transition-colors cursor-pointer"
                  >
                    {t(locale, 'applyCoupon')}
                  </button>
                </div>
                {couponError && <p className="text-xs text-red-600">{couponError}</p>}
                {appliedCoupon && (
                  <p className="text-xs text-emerald-700 font-medium">
                    {appliedCoupon.code} — {locale === 'bn' ? appliedCoupon.labelBn : appliedCoupon.labelEn}
                  </p>
                )}
              </div>
            </>
          ) : (
            /* Checkout Form */
            <form id="nexus-checkout-form" onSubmit={handleSubmitOrder} className="space-y-4">
              {formError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {formError}
                </p>
              )}

              {savedAddresses.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-700">
                    {locale === 'bn' ? 'সংরক্ষিত ঠিকানা থেকে বেছে নিন' : 'Quick-fill from Saved Addresses'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => {
                          setCustomerName(addr.recipientName);
                          setCustomerPhone(addr.phone);
                          setDivisionId(addr.divisionId);
                          setDistrictId(addr.districtId);
                          setUpazilaId(addr.upazilaId);
                          setAddressLine(addr.addressLine);
                        }}
                        className="text-left p-2.5 rounded-md border border-slate-200 hover:border-[#13204A] bg-[#F8FAFC] transition-colors cursor-pointer"
                      >
                        <p className="text-xs font-semibold text-[#13204A] truncate">
                          {addr.label} · {addr.recipientName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {addr.upazilaName}, {addr.districtName}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 block">
                  {t(locale, 'fullName')}
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#13204A]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 block">
                  {t(locale, 'mobileNumber')}
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:border-[#13204A]"
                />
              </div>

              {/* Bangladesh Division -> District -> Upazila Cascading Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 block">
                    {t(locale, 'division')}
                  </label>
                  <select
                    value={divisionId}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#13204A]"
                  >
                    {BD_DIVISIONS.map((div) => (
                      <option key={div.id} value={div.id}>
                        {locale === 'bn' ? div.bn : div.en}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 block">
                    {t(locale, 'district')}
                  </label>
                  <select
                    value={activeDistrict.id}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#13204A]"
                  >
                    {activeDivision.districts.map((dist) => (
                      <option key={dist.id} value={dist.id}>
                        {locale === 'bn' ? dist.bn : dist.en}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 block">
                    {t(locale, 'upazila')}
                  </label>
                  <select
                    value={activeUpazila.id}
                    onChange={(e) => setUpazilaId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#13204A]"
                  >
                    {activeDistrict.upazilas.map((upz) => (
                      <option key={upz.id} value={upz.id}>
                        {locale === 'bn' ? upz.bn : upz.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 block">
                  {t(locale, 'addressLine')}
                </label>
                <input
                  type="text"
                  required
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#13204A]"
                />
              </div>

              {/* Payment Gateway Selection */}
              <fieldset className="space-y-2 pt-2">
                <legend className="text-xs font-semibold text-slate-700">
                  {t(locale, 'paymentMethod')}
                </legend>
                {(
                  [
                    ['COD', 'codLabel'],
                    ['BKASH', 'bkashLabel'],
                    ['NAGAD', 'nagadLabel'],
                    ['SSLCOMMERZ', 'sslLabel'],
                  ] as const
                ).map(([method, key]) => (
                  <label
                    key={method}
                    className={`flex items-center gap-3 p-3 rounded-md border text-xs cursor-pointer transition-colors ${
                      paymentMethod === method
                        ? 'border-[#13204A] bg-[#13204A]/5 font-semibold text-[#13204A]'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                      className="accent-[#13204A]"
                    />
                    <span>{t(locale, key)}</span>
                  </label>
                ))}
              </fieldset>
            </form>
          )}
        </div>

        {/* Sticky Drawer Footer Totals */}
        {step !== 'confirmed' && resolvedItems.length > 0 && (
          <div className="border-t border-slate-200 p-6 bg-[#F8FAFC] space-y-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{t(locale, 'subtotal')}</span>
                <span className="font-mono tabular-nums">{formatBDT(subtotalPaisa, locale)}</span>
              </div>
              {discountPaisa > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>{t(locale, 'discount')}</span>
                  <span className="font-mono tabular-nums">-{formatBDT(discountPaisa, locale)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>
                  {t(locale, 'deliveryCharge')} ({locale === 'bn' ? activeDistrict.bn : activeDistrict.en})
                </span>
                <span className="font-mono tabular-nums">
                  {deliveryChargePaisa === 0
                    ? t(locale, 'freeDelivery')
                    : formatBDT(deliveryChargePaisa, locale)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#13204A] pt-2 border-t border-slate-200">
                <span>{t(locale, 'totalPayable')}</span>
                <span className="font-mono tabular-nums">{formatBDT(totalPaisa, locale)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#E8892B] font-semibold">
                <span>{t(locale, 'totalPvEarned')}</span>
                <span className="font-mono tabular-nums">+{formatPV(totalPv, locale)}</span>
              </div>
            </div>

            {step === 'bag' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md transition-colors cursor-pointer"
              >
                {t(locale, 'proceedCheckout')}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('bag')}
                  className="px-4 py-3 text-xs font-semibold text-[#13204A] border border-slate-300 bg-white rounded-md cursor-pointer"
                >
                  {t(locale, 'backToBag')}
                </button>
                <button
                  type="submit"
                  form="nexus-checkout-form"
                  className="flex-1 py-3 px-4 text-sm font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md transition-colors cursor-pointer"
                >
                  {t(locale, 'placeOrder')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
