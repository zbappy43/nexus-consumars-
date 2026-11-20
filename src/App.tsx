/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useState } from 'react';
import type {
  AppSection,
  AuditLogEntry,
  AuthSession,
  CartItem,
  CmsContentMap,
  CmsPageKey,
  CommissionRun,
  Coupon,
  DealerApplication,
  DealerRequisition,
  DealerStockItem,
  KycSubmission,
  Locale,
  MemberNode,
  NotificationItem,
  Order,
  OrderStatus,
  Product,
  Role,
  SavedAddress,
  SiteSettings,
  WalletLedgerEntry,
  WithdrawalMethod,
  WithdrawalRequest,
} from './types/domain';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_CMS_CONTENT,
  INITIAL_COMMISSION_RUNS,
  INITIAL_COUPONS,
  INITIAL_DEALER_APPLICATIONS,
  INITIAL_DEALER_STOCK,
  INITIAL_KYC_SUBMISSIONS,
  INITIAL_MEMBERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_RANKS,
  INITIAL_REQUISITIONS,
  INITIAL_SAVED_ADDRESSES,
  INITIAL_SETTINGS,
  INITIAL_WALLET_LEDGER,
  INITIAL_WITHDRAWALS,
} from './data/seedData';
import {
  calculatePercentagePaisa,
  deriveWalletBalancePaisa,
  formatBDT,
} from './lib/money';
import { createIdempotencyKey } from './lib/security';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { StorefrontView } from './components/StorefrontView';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { OrderTrackingView } from './components/OrderTrackingView';
import { AuthKycModal } from './components/AuthKycModal';
import { MemberDashboardView } from './components/MemberDashboardView';
import { DealerPortalView } from './components/DealerPortalView';
import { AdminPanelView } from './components/AdminPanelView';
import { CmsModal } from './components/CmsModal';

const STORAGE_KEY = 'nexus_consumers_state_v2';

interface PersistedState {
  products: Product[];
  coupons: Coupon[];
  settings: SiteSettings;
  members: Record<string, MemberNode>;
  orders: Order[];
  ledger: WalletLedgerEntry[];
  withdrawals: WithdrawalRequest[];
  kycSubmissions: KycSubmission[];
  dealerStock: DealerStockItem[];
  requisitions: DealerRequisition[];
  commissionRuns: CommissionRun[];
  auditLogs: AuditLogEntry[];
  savedAddresses: SavedAddress[];
  notifications: NotificationItem[];
  dealerApplications: DealerApplication[];
  cmsContent: CmsContentMap;
  cart: CartItem[];
  wishlistIds: string[];
}

function loadPersistedState(): Partial<PersistedState> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export default function App() {
  const [hydrated] = useState<Partial<PersistedState>>(() => loadPersistedState());

  const [locale, setLocale] = useState<Locale>('bn');
  const [activeSection, setActiveSection] = useState<AppSection>('store');
  const [session, setSession] = useState<AuthSession>({
    userId: 'NCL-100001',
    name: 'Mahmudul Hasan',
    mobile: '01711223344',
    role: 'MEMBER',
    memberId: 'NCL-100001',
    kycStatus: 'APPROVED',
  });

  // Core platform state (persisted to localStorage with safe fallback validation)
  const [products, setProducts] = useState<Product[]>(
    Array.isArray(hydrated.products) && hydrated.products.length > 0
      ? hydrated.products
      : INITIAL_PRODUCTS
  );
  const [coupons, setCoupons] = useState<Coupon[]>(
    Array.isArray(hydrated.coupons) ? hydrated.coupons : INITIAL_COUPONS
  );
  const [settings, setSettings] = useState<SiteSettings>({
    ...INITIAL_SETTINGS,
    ...(hydrated.settings ?? {}),
  });
  const [ranks] = useState(INITIAL_RANKS);
  const [members, setMembers] = useState<Record<string, MemberNode>>(
    hydrated.members && typeof hydrated.members === 'object' && Object.keys(hydrated.members).length > 0
      ? { ...INITIAL_MEMBERS, ...hydrated.members }
      : INITIAL_MEMBERS
  );
  const [orders, setOrders] = useState<Order[]>(
    Array.isArray(hydrated.orders) ? hydrated.orders : INITIAL_ORDERS
  );
  const [ledger, setLedger] = useState<WalletLedgerEntry[]>(
    Array.isArray(hydrated.ledger) ? hydrated.ledger : INITIAL_WALLET_LEDGER
  );
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(
    Array.isArray(hydrated.withdrawals) ? hydrated.withdrawals : INITIAL_WITHDRAWALS
  );
  const [kycSubmissions, setKycSubmissions] = useState<KycSubmission[]>(
    Array.isArray(hydrated.kycSubmissions) ? hydrated.kycSubmissions : INITIAL_KYC_SUBMISSIONS
  );
  const [dealerStock, setDealerStock] = useState<DealerStockItem[]>(
    Array.isArray(hydrated.dealerStock) ? hydrated.dealerStock : INITIAL_DEALER_STOCK
  );
  const [requisitions, setRequisitions] = useState<DealerRequisition[]>(
    Array.isArray(hydrated.requisitions) ? hydrated.requisitions : INITIAL_REQUISITIONS
  );
  const [commissionRuns, setCommissionRuns] = useState<CommissionRun[]>(
    Array.isArray(hydrated.commissionRuns) ? hydrated.commissionRuns : INITIAL_COMMISSION_RUNS
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(
    Array.isArray(hydrated.auditLogs) ? hydrated.auditLogs : INITIAL_AUDIT_LOGS
  );
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(
    Array.isArray(hydrated.savedAddresses) ? hydrated.savedAddresses : INITIAL_SAVED_ADDRESSES
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    Array.isArray(hydrated.notifications) ? hydrated.notifications : INITIAL_NOTIFICATIONS
  );
  const [dealerApplications, setDealerApplications] = useState<DealerApplication[]>(
    Array.isArray(hydrated.dealerApplications)
      ? hydrated.dealerApplications
      : INITIAL_DEALER_APPLICATIONS
  );
  const [cmsContent, setCmsContent] = useState<CmsContentMap>({
    ...INITIAL_CMS_CONTENT,
    ...(hydrated.cmsContent ?? {}),
  });

  // Shopping & UI overlay state
  const [cart, setCart] = useState<CartItem[]>(
    Array.isArray(hydrated.cart)
      ? hydrated.cart
      : [{ productId: 'prod-mustard-oil', variantId: 'v-oil-1000', quantity: 1 }]
  );
  const [wishlistIds, setWishlistIds] = useState<string[]>(
    Array.isArray(hydrated.wishlistIds) ? hydrated.wishlistIds : ['prod-sylhet-tea']
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [authModal, setAuthModal] = useState<{ open: boolean; tab: 'login' | 'register' | 'kyc' }>({
    open: false,
    tab: 'login',
  });
  const [cmsPage, setCmsPage] = useState<CmsPageKey | null>(null);
  const [trackedOrderId, setTrackedOrderId] = useState<string | undefined>(undefined);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    try {
      const payload: PersistedState = {
        products,
        coupons,
        settings,
        members,
        orders,
        ledger,
        withdrawals,
        kycSubmissions,
        dealerStock,
        requisitions,
        commissionRuns,
        auditLogs,
        savedAddresses,
        notifications,
        dealerApplications,
        cmsContent,
        cart,
        wishlistIds,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota or storage restriction errors cleanly
    }
  }, [
    products,
    coupons,
    settings,
    members,
    orders,
    ledger,
    withdrawals,
    kycSubmissions,
    dealerStock,
    requisitions,
    commissionRuns,
    auditLogs,
    savedAddresses,
    notifications,
    dealerApplications,
    cmsContent,
    cart,
    wishlistIds,
  ]);

  const appendAudit = (action: string, entityType: string, entityId: string, details: string) => {
    const entry: AuditLogEntry = {
      id: `AUD-${Math.floor(9003 + Math.random() * 9000)}`,
      at: new Date().toISOString(),
      actorName: session.name,
      actorRole: session.role,
      action,
      entityType,
      entityId,
      details,
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  const pushNotification = (
    titleEn: string,
    titleBn: string,
    bodyEn: string,
    bodyBn: string,
    category: NotificationItem['category']
  ) => {
    const item: NotificationItem = {
      id: `NOTIF-${Date.now().toString().slice(-5)}`,
      createdAt: new Date().toISOString(),
      titleEn,
      titleBn,
      bodyEn,
      bodyBn,
      read: false,
      category,
    };
    setNotifications((prev) => [item, ...prev]);
  };

  const handleResetDemoData = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setProducts(INITIAL_PRODUCTS);
    setCoupons(INITIAL_COUPONS);
    setSettings(INITIAL_SETTINGS);
    setMembers(INITIAL_MEMBERS);
    setOrders(INITIAL_ORDERS);
    setLedger(INITIAL_WALLET_LEDGER);
    setWithdrawals(INITIAL_WITHDRAWALS);
    setKycSubmissions(INITIAL_KYC_SUBMISSIONS);
    setDealerStock(INITIAL_DEALER_STOCK);
    setRequisitions(INITIAL_REQUISITIONS);
    setCommissionRuns(INITIAL_COMMISSION_RUNS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setSavedAddresses(INITIAL_SAVED_ADDRESSES);
    setNotifications(INITIAL_NOTIFICATIONS);
    setDealerApplications(INITIAL_DEALER_APPLICATIONS);
    setCmsContent(INITIAL_CMS_CONTENT);
    setCart([{ productId: 'prod-mustard-oil', variantId: 'v-oil-1000', quantity: 1 }]);
    setWishlistIds(['prod-sylhet-tea']);
  };

  const handleSwitchRole = (nextRole: Role) => {
    if (nextRole === 'CUSTOMER') {
      setSession({
        userId: 'GUEST-01',
        name: 'Guest Shopper',
        mobile: '',
        role: 'CUSTOMER',
        kycStatus: 'NOT_SUBMITTED',
      });
    } else if (nextRole === 'MEMBER') {
      setSession({
        userId: 'NCL-100001',
        name: 'Mahmudul Hasan',
        mobile: '01711223344',
        role: 'MEMBER',
        memberId: 'NCL-100001',
        kycStatus: 'APPROVED',
      });
    } else if (nextRole === 'DEALER') {
      setSession({
        userId: 'DLR-KISH-01',
        name: 'Kishoreganj Sadar Dealer',
        mobile: '01711009988',
        role: 'DEALER',
        memberId: 'NCL-100001',
        dealerId: 'DLR-KISH-01',
        kycStatus: 'APPROVED',
      });
    } else {
      setSession({
        userId: `STAFF-${nextRole}`,
        name: nextRole.replace('_', ' '),
        mobile: '01700000001',
        role: nextRole,
        memberId: 'NCL-100001',
        kycStatus: 'APPROVED',
      });
    }
  };

  const handleAddToCart = (productId: string, variantId: string, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId && i.variantId === variantId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId && i.variantId === variantId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { productId, variantId, quantity }];
    });
  };

  const handleUpdateCartQty = (productId: string, variantId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => !(i.productId === productId && i.variantId === variantId)));
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId && i.variantId === variantId ? { ...i, quantity: qty } : i
      )
    );
  };

  const handleRemoveCartItem = (productId: string, variantId: string) => {
    setCart((prev) => prev.filter((i) => !(i.productId === productId && i.variantId === variantId)));
  };

  const handleAddReview = (
    productId: string,
    author: string,
    city: string,
    rating: number,
    comment: string
  ) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const newReview = {
          id: `REV-${Date.now().toString().slice(-5)}`,
          author,
          city,
          rating,
          commentEn: comment,
          commentBn: comment,
          date: new Date().toISOString().slice(0, 10),
        };
        const nextCount = p.reviewCount + 1;
        const nextRating = Number(((p.rating * p.reviewCount + rating) / nextCount).toFixed(1));
        return {
          ...p,
          reviewCount: nextCount,
          rating: nextRating,
          reviews: [newReview, ...p.reviews],
        };
      })
    );
  };

  const handlePlaceOrder = (order: Order) => {
    setOrders((prev) => [order, ...prev]);
    setCart([]);
    appendAudit(
      'ORDER_PLACED',
      'Order',
      order.id,
      `Placed via ${order.paymentMethod} (${formatBDT(order.totalPaisa, 'en')}, ${order.totalPv} PV pending delivery)`
    );
    pushNotification(
      `Order ${order.id} Placed`,
      `অর্ডার ${order.id} গৃহীত হয়েছে`,
      `Your order (${formatBDT(order.totalPaisa, 'en')}) is confirmed. +${order.totalPv} PV will be credited upon delivery.`,
      `আপনার অর্ডার (${formatBDT(order.totalPaisa, 'bn')}) গৃহীত হয়েছে। ডেলিভারির পর +${order.totalPv} পিভি যুক্ত হবে।`,
      'ORDER'
    );
  };

  const creditOrReverseMemberPv = (memberId: string | undefined, deltaPv: number) => {
    if (!memberId) return;
    setMembers((prev) => {
      const target = prev[memberId];
      if (!target) return prev;
      return {
        ...prev,
        [memberId]: {
          ...target,
          personalPv: Math.max(0, target.personalPv + deltaPv),
        },
      };
    });
  };

  const handleUpdateOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    const existing = orders.find((o) => o.id === orderId);
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        let pvCredited = o.pvCredited;
        let pvReversed = o.pvReversed;
        let note = `Status transitioned from ${o.status} to ${nextStatus}`;

        // Critical rule: PV is credited strictly on DELIVERED and reversed on REFUNDED
        if (nextStatus === 'DELIVERED' && !o.pvCredited && !o.pvReversed) {
          pvCredited = true;
          creditOrReverseMemberPv(o.memberId, o.totalPv);
          note = `Delivered — credited ${o.totalPv} PV to ${o.memberId || 'guest'}`;
        } else if (nextStatus === 'REFUNDED' && o.pvCredited && !o.pvReversed) {
          pvReversed = true;
          creditOrReverseMemberPv(o.memberId, -o.totalPv);
          note = `Refunded — reversed ${o.totalPv} PV from ${o.memberId || 'guest'}`;
        }

        return {
          ...o,
          status: nextStatus,
          paymentStatus:
            nextStatus === 'REFUNDED' ? 'REFUNDED' : nextStatus === 'DELIVERED' ? 'PAID' : o.paymentStatus,
          pvCredited,
          pvReversed,
          history: [
            ...o.history,
            {
              status: nextStatus,
              at: new Date().toISOString(),
              actor: session.name,
              note,
            },
          ],
        };
      })
    );
    appendAudit('ORDER_STATUS_UPDATED', 'Order', orderId, `Transitioned order to ${nextStatus}`);

    if (existing && nextStatus === 'DELIVERED' && !existing.pvCredited) {
      pushNotification(
        `Order ${orderId} Delivered & PV Credited`,
        `অর্ডার ${orderId} ডেলিভার্ড ও পিভি যুক্ত হয়েছে`,
        `+${existing.totalPv} PV has been credited to member account ${existing.memberId || 'customer'}.`,
        `মেম্বার অ্যাকাউন্টে +${existing.totalPv} পিভি সফলভাবে যুক্ত হয়েছে।`,
        'ORDER'
      );
    } else if (existing && nextStatus === 'REFUNDED' && existing.pvCredited && !existing.pvReversed) {
      pushNotification(
        `Order ${orderId} Refunded & PV Reversed`,
        `অর্ডার ${orderId} রিফান্ড ও পিভি সমন্বয় হয়েছে`,
        `${existing.totalPv} PV was reversed due to order refund.`,
        `অর্ডার রিফান্ডের কারণে ${existing.totalPv} পিভি সমন্বয় করা হয়েছে।`,
        'ORDER'
      );
    }
  };

  const handleRegisterMember = (
    name: string,
    mobile: string,
    sponsorId: string | null
  ): AuthSession => {
    const nextNum = 100001 + Object.keys(members).length;
    const memberId = `NCL-${nextNum}`;
    const parentId = sponsorId && members[sponsorId] ? sponsorId : 'NCL-100001';
    const newNode: MemberNode = {
      memberId,
      name,
      mobile,
      rankCode: 'PSM',
      sponsorId: parentId,
      placementParentId: parentId,
      placementSide: members[parentId]?.childrenIds.length % 2 === 0 ? 'LEFT' : 'RIGHT',
      personalPv: 0,
      leftTeamPv: 0,
      rightTeamPv: 0,
      joinedAt: new Date().toISOString().slice(0, 10),
      kycStatus: 'NOT_SUBMITTED',
      childrenIds: [],
    };

    setMembers((prev) => ({
      ...prev,
      [parentId]: {
        ...prev[parentId],
        childrenIds: [...prev[parentId].childrenIds, memberId],
      },
      [memberId]: newNode,
    }));

    return {
      userId: memberId,
      name,
      mobile,
      role: 'MEMBER',
      memberId,
      kycStatus: 'NOT_SUBMITTED',
    };
  };

  const handleSubmitKyc = (submission: KycSubmission) => {
    setKycSubmissions((prev) => [submission, ...prev]);
    setMembers((prev) => {
      const existing = prev[submission.memberId];
      if (!existing) return prev;
      return {
        ...prev,
        [submission.memberId]: { ...existing, kycStatus: 'PENDING' },
      };
    });
    if (session.memberId === submission.memberId) {
      setSession((prev) => ({ ...prev, kycStatus: 'PENDING' }));
    }
    appendAudit(
      'KYC_SUBMITTED',
      'KycSubmission',
      submission.id,
      `Member ${submission.memberId} submitted KYC (${submission.maskedNid})`
    );
  };

  const handleReviewKyc = (
    kycId: string,
    decision: 'APPROVED' | 'REJECTED',
    reason?: string
  ) => {
    const target = kycSubmissions.find((k) => k.id === kycId);
    if (!target) return;
    setKycSubmissions((prev) =>
      prev.map((k) =>
        k.id === kycId
          ? {
              ...k,
              status: decision,
              rejectionReason: decision === 'REJECTED' ? reason : undefined,
              reviewedBy: session.name,
              reviewedAt: new Date().toISOString(),
            }
          : k
      )
    );
    setMembers((prev) => {
      const m = prev[target.memberId];
      if (!m) return prev;
      return { ...prev, [target.memberId]: { ...m, kycStatus: decision } };
    });
    appendAudit(
      `KYC_${decision}`,
      'KycSubmission',
      kycId,
      `Reviewed ${target.memberId} (${target.maskedNid})${reason ? ` — Reason: ${reason}` : ''}`
    );
    pushNotification(
      `KYC ${decision} for ${target.memberId}`,
      `${target.memberId}-এর কেওয়াইসি ${decision === 'APPROVED' ? 'অনুমোদিত' : 'প্রত্যাখ্যাত'} হয়েছে`,
      decision === 'APPROVED'
        ? `Member pricing and wallet withdrawals are now active for ${target.fullName}.`
        : `KYC rejected: ${reason || 'Please re-upload valid documents.'}`,
      decision === 'APPROVED'
        ? `${target.fullName}-এর জন্য মেম্বার মূল্য ও ওয়ালেট উত্তোলন সক্রিয় হয়েছে।`
        : `কেওয়াইসি প্রত্যাখ্যাত: ${reason || 'সঠিক নথি পুনরায় জমা দিন।'}`,
      'KYC'
    );
  };

  const handleRequestWithdrawal = (
    memberId: string,
    method: WithdrawalMethod,
    accountNumber: string,
    grossAmountPaisa: number
  ): string | null => {
    if (grossAmountPaisa < settings.minWithdrawalPaisa) {
      return `Minimum withdrawal is ${formatBDT(settings.minWithdrawalPaisa, locale)}.`;
    }
    const balance = deriveWalletBalancePaisa(ledger.filter((e) => e.memberId === memberId));
    if (grossAmountPaisa > balance) {
      return `Insufficient wallet balance (${formatBDT(balance, locale)} available).`;
    }

    const feePaisa = calculatePercentagePaisa(grossAmountPaisa, settings.withdrawalFeePercent);
    const netAmountPaisa = grossAmountPaisa - feePaisa;
    const wdId = `WD-${Math.floor(2003 + Math.random() * 7900)}`;

    const request: WithdrawalRequest = {
      id: wdId,
      memberId,
      memberName: members[memberId]?.name || session.name,
      method,
      accountNumber,
      grossAmountPaisa,
      feePaisa,
      netAmountPaisa,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    const ledgerDebit: WalletLedgerEntry = {
      id: `LED-${Math.floor(1100 + Math.random() * 8800)}`,
      memberId,
      createdAt: new Date().toISOString(),
      type: 'WITHDRAWAL',
      amountPaisa: -grossAmountPaisa,
      idempotencyKey: createIdempotencyKey(`wd_${wdId}`),
      ruleSummary: `Withdrawal reservation ${wdId} to ${method} (${accountNumber})`,
    };

    setWithdrawals((prev) => [request, ...prev]);
    setLedger((prev) => [ledgerDebit, ...prev]);
    appendAudit(
      'WITHDRAWAL_REQUESTED',
      'WithdrawalRequest',
      wdId,
      `${memberId} requested ${formatBDT(grossAmountPaisa, 'en')} via ${method}`
    );
    return null;
  };

  const handleUpdateWithdrawal = (
    wdId: string,
    status: 'PAID' | 'REJECTED',
    txReferenceOrReason: string
  ) => {
    const target = withdrawals.find((w) => w.id === wdId);
    if (!target || target.status !== 'PENDING') return;
    setWithdrawals((prev) =>
      prev.map((w) =>
        w.id === wdId
          ? {
              ...w,
              status,
              txReference: status === 'PAID' ? txReferenceOrReason : undefined,
              rejectionReason: status === 'REJECTED' ? txReferenceOrReason : undefined,
            }
          : w
      )
    );
    if (status === 'REJECTED') {
      setLedger((prev) => [
        {
          id: `LED-${Math.floor(1100 + Math.random() * 8800)}`,
          memberId: target.memberId,
          createdAt: new Date().toISOString(),
          type: 'WITHDRAWAL',
          amountPaisa: target.grossAmountPaisa,
          idempotencyKey: createIdempotencyKey(`wd_rev_${wdId}`),
          ruleSummary: `Reversal for rejected withdrawal ${wdId}: ${txReferenceOrReason}`,
        },
        ...prev,
      ]);
    }
    appendAudit(
      `WITHDRAWAL_${status}`,
      'WithdrawalRequest',
      wdId,
      `${status} (${txReferenceOrReason})`
    );
    pushNotification(
      `Withdrawal ${wdId} ${status}`,
      `উত্তোলন ${wdId} ${status === 'PAID' ? 'পরিশোধিত' : 'বাতিল'} হয়েছে`,
      status === 'PAID'
        ? `Net ${formatBDT(target.netAmountPaisa, 'en')} sent via ${target.method} (Ref: ${txReferenceOrReason}).`
        : `Withdrawal reversed to wallet: ${txReferenceOrReason}.`,
      status === 'PAID'
        ? `${target.method}-এ ${formatBDT(target.netAmountPaisa, 'bn')} পাঠানো হয়েছে (রেফ: ${txReferenceOrReason})।`
        : `উত্তোলনের অর্থ ওয়ালেটে ফেরত দেওয়া হয়েছে: ${txReferenceOrReason}।`,
      'WALLET'
    );
  };

  const handleGenerateCommissionDryRun = (periodLabel: string) => {
    if (commissionRuns.some((r) => r.periodLabel === periodLabel && r.status === 'LOCKED')) {
      return;
    }
    const items = Object.values(members)
      .filter((m) => m.kycStatus === 'APPROVED')
      .slice(0, 3)
      .map((m) => {
        const matchedPv = Math.min(m.leftTeamPv, m.rightTeamPv, 300);
        const grossPaisa = matchedPv * settings.matchingBonusPerPvPaisa;
        const tdsPaisa = calculatePercentagePaisa(grossPaisa, settings.tdsPercent);
        const netPaisa = Math.max(0, grossPaisa - tdsPaisa);
        return {
          memberId: m.memberId,
          memberName: m.name,
          bonusType: 'MATCHING' as const,
          basisPv: matchedPv,
          ratePercent: 100,
          grossPaisa,
          tdsPaisa,
          netPaisa,
          explanation: `Weak-leg match ${matchedPv} PV × ${formatBDT(settings.matchingBonusPerPvPaisa, 'en')}/PV less ${settings.tdsPercent}% TDS (TODO: confirm)`,
        };
      })
      .filter((item) => item.netPaisa > 0);

    const run: CommissionRun = {
      id: `RUN-${Math.floor(2026110 + Math.random() * 880)}`,
      periodLabel,
      status: 'DRY_RUN',
      createdAt: new Date().toISOString(),
      totalNetPaisa: items.reduce((s, i) => s + i.netPaisa, 0),
      items,
    };

    setCommissionRuns((prev) => [run, ...prev]);
    appendAudit(
      'COMMISSION_DRY_RUN',
      'CommissionRun',
      run.id,
      `Generated dry-run for ${periodLabel} (${items.length} member payouts)`
    );
  };

  const handleApproveAndLockCommissionRun = (runId: string) => {
    const target = commissionRuns.find((r) => r.id === runId);
    if (!target || target.status === 'LOCKED') return;

    const newLedgerEntries: WalletLedgerEntry[] = target.items.map((item, idx) => ({
      id: `LED-${Date.now().toString().slice(-4)}-${idx}`,
      memberId: item.memberId,
      createdAt: new Date().toISOString(),
      type: item.bonusType,
      amountPaisa: item.netPaisa,
      idempotencyKey: `comm_${runId}_${item.memberId}_${item.bonusType}`,
      ruleSummary: `${target.periodLabel}: ${item.explanation}`,
      commissionRunId: runId,
    }));

    setLedger((prev) => [...newLedgerEntries, ...prev]);
    setCommissionRuns((prev) =>
      prev.map((r) =>
        r.id === runId
          ? { ...r, status: 'LOCKED', lockedAt: new Date().toISOString() }
          : r
      )
    );
    appendAudit(
      'COMMISSION_RUN_LOCKED',
      'CommissionRun',
      runId,
      `Approved, posted ${newLedgerEntries.length} double-entry rows (${formatBDT(target.totalNetPaisa, 'en')}), and permanently locked period.`
    );
    pushNotification(
      `Commission Run ${target.periodLabel} Posted`,
      `কমিশন সাইকেল ${target.periodLabel} ওয়ালেটে যুক্ত হয়েছে`,
      `Net ${formatBDT(target.totalNetPaisa, 'en')} credited across ${newLedgerEntries.length} ledger entries.`,
      `${newLedgerEntries.length}টি লেজার এন্ট্রিতে মোট ${formatBDT(target.totalNetPaisa, 'bn')} ওয়ালেটে যুক্ত হয়েছে।`,
      'WALLET'
    );
  };

  const handleDealerPosSale = (
    memberId: string,
    variantId: string,
    qty: number
  ): string | null => {
    const stockItem = dealerStock.find((s) => s.variantId === variantId);
    const member = members[memberId];
    if (!member) return 'Member ID not found.';
    if (!stockItem || stockItem.quantity < qty) return 'Insufficient dealer stock.';

    const totalPaisa = stockItem.memberPricePaisa * qty;
    const totalPv = stockItem.pv * qty;
    const posOrderId = `POS-2026-${Math.floor(2000 + Math.random() * 7900)}`;

    const posOrder: Order = {
      id: posOrderId,
      idempotencyKey: createIdempotencyKey('pos'),
      createdAt: new Date().toISOString(),
      customerName: member.name,
      customerPhone: member.mobile,
      memberId: member.memberId,
      buyerRole: 'MEMBER',
      division: 'Dhaka',
      district: 'Kishoreganj',
      upazila: 'Kishoreganj Sadar',
      addressLine: 'Walk-in Counter — Kishoreganj Sadar Stock Point',
      paymentMethod: 'COD',
      paymentStatus: 'PAID',
      status: 'DELIVERED',
      assignedDealerId: 'DLR-KISH-01',
      channel: 'DEALER_POS',
      subtotalPaisa: totalPaisa,
      discountPaisa: 0,
      deliveryChargePaisa: 0,
      totalPaisa,
      totalPv,
      pvCredited: true,
      pvReversed: false,
      items: [
        {
          productId: stockItem.sku,
          variantId: stockItem.variantId,
          sku: stockItem.sku,
          nameEn: stockItem.productNameEn,
          nameBn: stockItem.productNameBn,
          variantLabelEn: stockItem.variantLabel,
          variantLabelBn: stockItem.variantLabel,
          quantity: qty,
          unitMrpPaisa: stockItem.mrpPaisa,
          unitMemberPricePaisa: stockItem.memberPricePaisa,
          unitChargedPaisa: stockItem.memberPricePaisa,
          unitPv: stockItem.pv,
        },
      ],
      history: [
        {
          status: 'DELIVERED',
          at: new Date().toISOString(),
          actor: 'Dealer DLR-KISH-01 (POS)',
          note: `Walk-in sale completed; ${totalPv} PV credited to ${member.memberId}`,
        },
      ],
    };

    setDealerStock((prev) =>
      prev.map((s) => (s.variantId === variantId ? { ...s, quantity: s.quantity - qty } : s))
    );
    setOrders((prev) => [posOrder, ...prev]);
    creditOrReverseMemberPv(member.memberId, totalPv);
    appendAudit(
      'DEALER_POS_SALE',
      'Order',
      posOrderId,
      `Dealer sold ${qty} × ${stockItem.sku} to ${member.memberId}; credited ${totalPv} PV.`
    );
    return null;
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      <Header
        locale={locale}
        onChangeLocale={setLocale}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        session={session}
        onSwitchRole={handleSwitchRole}
        onOpenAuth={(tab = 'login') => setAuthModal({ open: true, tab })}
      />

      <main className="flex-1">
        {activeSection === 'store' && (
          <StorefrontView
            locale={locale}
            products={products}
            session={session}
            wishlistIds={wishlistIds}
            onToggleWishlist={(id) =>
              setWishlistIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
              )
            }
            onAddToCart={handleAddToCart}
            onAddReview={handleAddReview}
            onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
            onGoToDealer={() => {
              handleSwitchRole('DEALER');
              setActiveSection('dealer');
            }}
          />
        )}

        {activeSection === 'member' && (
          <MemberDashboardView
            locale={locale}
            session={session}
            members={members}
            orders={orders}
            ledger={ledger}
            withdrawals={withdrawals}
            ranks={ranks}
            kycSubmissions={kycSubmissions}
            savedAddresses={savedAddresses}
            notifications={notifications}
            settings={settings}
            onRequestWithdrawal={handleRequestWithdrawal}
            onAddAddress={(addr) => setSavedAddresses((prev) => [addr, ...prev])}
            onDeleteAddress={(id) =>
              setSavedAddresses((prev) => prev.filter((a) => a.id !== id))
            }
            onMarkAllNotificationsRead={() =>
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
            }
            onReorder={(order) => {
              order.items.forEach((item) => {
                handleAddToCart(item.productId, item.variantId, item.quantity);
              });
              setCartOpen(true);
            }}
            onTrackOrder={(orderId) => {
              setTrackedOrderId(orderId);
              setActiveSection('track');
            }}
            onOpenKyc={() => setAuthModal({ open: true, tab: 'kyc' })}
          />
        )}

        {activeSection === 'dealer' && (
          <DealerPortalView
            locale={locale}
            session={session}
            stock={dealerStock}
            requisitions={requisitions}
            orders={orders}
            members={members}
            settings={settings}
            onSubmitRequisition={(sku, productName, requestedQty) => {
              const req: DealerRequisition = {
                id: `REQ-${Math.floor(402 + Math.random() * 590)}`,
                dealerId: 'DLR-KISH-01',
                sku,
                productName,
                requestedQty,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
              };
              setRequisitions((prev) => [req, ...prev]);
              appendAudit('DEALER_REQUISITION', 'DealerRequisition', req.id, `${sku} × ${requestedQty}`);
            }}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onCompletePosSale={handleDealerPosSale}
            onSubmitDealerApplication={(app) => {
              setDealerApplications((prev) => [app, ...prev]);
              appendAudit(
                'DEALER_APPLICATION_SUBMITTED',
                'DealerApplication',
                app.id,
                `${app.businessName} (${app.district}, ${app.division})`
              );
            }}
            onTrackOrder={(orderId) => {
              setTrackedOrderId(orderId);
              setActiveSection('track');
            }}
          />
        )}

        {activeSection === 'admin' && (
          <AdminPanelView
            locale={locale}
            session={session}
            products={products}
            coupons={coupons}
            dealerApplications={dealerApplications}
            cmsContent={cmsContent}
            members={members}
            ledger={ledger}
            orders={orders}
            kycSubmissions={kycSubmissions}
            commissionRuns={commissionRuns}
            withdrawals={withdrawals}
            settings={settings}
            ranks={ranks}
            auditLogs={auditLogs}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onReviewKyc={handleReviewKyc}
            onGenerateCommissionDryRun={handleGenerateCommissionDryRun}
            onApproveAndLockCommissionRun={handleApproveAndLockCommissionRun}
            onUpdateWithdrawal={handleUpdateWithdrawal}
            onSaveSettings={(next) => {
              setSettings(next);
              appendAudit(
                'SETTINGS_UPDATED',
                'SiteSettings',
                'global',
                'Updated delivery, withdrawal, and TDS parameters.'
              );
            }}
            onAddProduct={(newProduct) => {
              setProducts((prev) => [newProduct, ...prev]);
              appendAudit(
                'PRODUCT_CREATED',
                'Product',
                newProduct.id,
                `Created ${newProduct.nameEn} (${newProduct.variants[0]?.sku})`
              );
            }}
            onUpdateVariant={(productId, variantId, patch) => {
              setProducts((prev) =>
                prev.map((p) =>
                  p.id === productId
                    ? {
                        ...p,
                        variants: p.variants.map((v) =>
                          v.id === variantId ? { ...v, ...patch } : v
                        ),
                      }
                    : p
                )
              );
            }}
            onToggleCoupon={(code) => {
              setCoupons((prev) =>
                prev.map((c) => (c.code === code ? { ...c, active: !c.active } : c))
              );
              appendAudit('COUPON_TOGGLED', 'Coupon', code, `Toggled active status for ${code}`);
            }}
            onAddCoupon={(coupon) => {
              setCoupons((prev) => [coupon, ...prev.filter((c) => c.code !== coupon.code)]);
              appendAudit('COUPON_CREATED', 'Coupon', coupon.code, `Created promo code ${coupon.code}`);
            }}
            onReviewDealerApplication={(appId, decision) => {
              const app = dealerApplications.find((a) => a.id === appId);
              setDealerApplications((prev) =>
                prev.map((a) => (a.id === appId ? { ...a, status: decision } : a))
              );
              appendAudit(
                `DEALER_APP_${decision}`,
                'DealerApplication',
                appId,
                `${decision} dealer application for ${app?.businessName || appId}`
              );
              if (app) {
                pushNotification(
                  `Dealer Application ${decision}`,
                  `ডিলার আবেদন ${decision === 'APPROVED' ? 'অনুমোদিত' : 'প্রত্যাখ্যাত'}`,
                  `${app.businessName} (${app.district}) has been ${decision.toLowerCase()}.`,
                  `${app.businessName} (${app.district})-এর ডিলার আবেদন ${decision === 'APPROVED' ? 'অনুমোদিত' : 'প্রত্যাখ্যাত'} হয়েছে।`,
                  'SYSTEM'
                );
              }
            }}
            onUpdateCmsPage={(page, body) => {
              setCmsContent((prev) => ({
                ...prev,
                [page]: { ...prev[page], body },
              }));
              appendAudit('CMS_PAGE_UPDATED', 'CmsPage', page, `Updated CMS page content: ${page}`);
            }}
            onResetDemoData={handleResetDemoData}
            onSwitchToAdmin={() => handleSwitchRole('SUPER_ADMIN')}
          />
        )}

        {activeSection === 'track' && (
          <OrderTrackingView
            locale={locale}
            orders={orders}
            initialOrderId={trackedOrderId}
          />
        )}
      </main>

      <Footer
        locale={locale}
        settings={settings}
        onSelectSection={setActiveSection}
        onOpenCms={setCmsPage}
      />

      <CartCheckoutDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        locale={locale}
        cart={cart}
        products={products}
        coupons={coupons}
        savedAddresses={savedAddresses}
        settings={settings}
        session={session}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onPlaceOrder={handlePlaceOrder}
        onTrackOrder={(orderId) => {
          setTrackedOrderId(orderId);
          setActiveSection('track');
        }}
      />

      <AuthKycModal
        open={authModal.open}
        initialTab={authModal.tab}
        onClose={() => setAuthModal((prev) => ({ ...prev, open: false }))}
        locale={locale}
        session={session}
        members={members}
        onLoginSuccess={setSession}
        onRegisterMember={handleRegisterMember}
        onSubmitKyc={handleSubmitKyc}
      />

      <CmsModal
        page={cmsPage}
        onClose={() => setCmsPage(null)}
        locale={locale}
        settings={settings}
        cmsContent={cmsContent}
      />
    </div>
  );
}
