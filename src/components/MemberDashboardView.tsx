import { useMemo, useState } from 'react';
import { Bell, Check, ChevronDown, ChevronRight, Copy, MapPin, RotateCcw, Trash2 } from 'lucide-react';
import type {
  AuthSession,
  BonusType,
  KycSubmission,
  Locale,
  MemberNode,
  NotificationItem,
  Order,
  RankConfig,
  SavedAddress,
  SiteSettings,
  WalletLedgerEntry,
  WithdrawalMethod,
  WithdrawalRequest,
} from '../types/domain';
import { BD_DIVISIONS } from '../data/bdLocations';
import { t } from '../lib/i18n';
import {
  calculatePercentagePaisa,
  deriveWalletBalancePaisa,
  formatBDT,
  formatNumber,
  formatPV,
} from '../lib/money';
import { hasPermission } from '../lib/rbac';
import { validateBdMobile } from '../lib/security';

interface MemberDashboardViewProps {
  locale: Locale;
  session: AuthSession;
  members: Record<string, MemberNode>;
  orders: Order[];
  ledger: WalletLedgerEntry[];
  withdrawals: WithdrawalRequest[];
  ranks: RankConfig[];
  kycSubmissions: KycSubmission[];
  savedAddresses: SavedAddress[];
  notifications: NotificationItem[];
  settings: SiteSettings;
  onRequestWithdrawal: (
    memberId: string,
    method: WithdrawalMethod,
    accountNumber: string,
    grossAmountPaisa: number
  ) => string | null;
  onAddAddress: (address: SavedAddress) => void;
  onDeleteAddress: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onReorder: (order: Order) => void;
  onTrackOrder: (orderId: string) => void;
  onOpenKyc: () => void;
}

/** Deterministic lightweight SVG QR pattern for Member Referral URL */
function ReferralQrSvg({ seed }: { seed: string }) {
  const size = 15;
  const cells: Array<{ x: number; y: number }> = [];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inFinder =
        (x < 4 && y < 4) || (x >= size - 4 && y < 4) || (x < 4 && y >= size - 4);
      if (inFinder) {
        const border =
          x === 0 ||
          y === 0 ||
          x === 3 ||
          y === 3 ||
          x === size - 1 ||
          x === size - 4 ||
          y === size - 1 ||
          y === size - 4;
        const center =
          (x >= 1 && x <= 2 && y >= 1 && y <= 2) ||
          (x >= size - 3 && x <= size - 2 && y >= 1 && y <= 2) ||
          (x >= 1 && x <= 2 && y >= size - 3 && y <= size - 2);
        if (border || center) cells.push({ x, y });
      } else {
        const bit = ((h >>> ((x * 7 + y * 13) % 24)) ^ (x * y + x + y)) & 1;
        if (bit === 1) cells.push({ x, y });
      }
    }
  }
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-28 h-28 bg-white p-2 border border-slate-200 rounded"
      role="img"
      aria-label={`QR Code for ${seed}`}
    >
      {cells.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={0.92} height={0.92} fill="#13204A" />
      ))}
    </svg>
  );
}

export function MemberDashboardView({
  locale,
  session,
  members,
  orders,
  ledger,
  withdrawals,
  ranks,
  kycSubmissions,
  savedAddresses,
  notifications,
  settings,
  onRequestWithdrawal,
  onAddAddress,
  onDeleteAddress,
  onMarkAllNotificationsRead,
  onReorder,
  onTrackOrder,
  onOpenKyc,
}: MemberDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'network' | 'wallet' | 'rank' | 'addresses'>('overview');
  const [bonusFilter, setBonusFilter] = useState<'ALL' | BonusType>('ALL');
  const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>(['NCL-100001']);
  const [copiedLink, setCopiedLink] = useState(false);

  // Withdrawal form state
  const [wdMethod, setWdMethod] = useState<WithdrawalMethod>('BKASH');
  const [wdAccount, setWdAccount] = useState(session.mobile || '01711223344');
  const [wdTaka, setWdTaka] = useState('500');
  const [wdFeedback, setWdFeedback] = useState('');

  // New Address Book state
  const [addrLabel, setAddrLabel] = useState('');
  const [addrName, setAddrName] = useState(session.name || '');
  const [addrPhone, setAddrPhone] = useState(session.mobile || '01711223344');
  const [addrDivId, setAddrDivId] = useState('dhaka');
  const [addrDistId, setAddrDistId] = useState('kishoreganj');
  const [addrUpzId, setAddrUpzId] = useState('kishoreganj-sadar');
  const [addrLine, setAddrLine] = useState('');
  const [addrError, setAddrError] = useState('');

  const addrDivision = BD_DIVISIONS.find((d) => d.id === addrDivId) ?? BD_DIVISIONS[0];
  const addrDistrict =
    addrDivision.districts.find((d) => d.id === addrDistId) ?? addrDivision.districts[0];
  const addrUpazila =
    addrDistrict.upazilas.find((u) => u.id === addrUpzId) ?? addrDistrict.upazilas[0];

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const canAccess = hasPermission(session.role, 'member:portal');
  const activeMemberId = session.memberId && members[session.memberId] ? session.memberId : 'NCL-100001';
  const member = members[activeMemberId];

  const memberLedger = useMemo(
    () => ledger.filter((entry) => entry.memberId === activeMemberId),
    [ledger, activeMemberId]
  );
  const walletBalancePaisa = useMemo(
    () => deriveWalletBalancePaisa(memberLedger),
    [memberLedger]
  );

  const filteredLedger = useMemo(() => {
    if (bonusFilter === 'ALL') return memberLedger;
    return memberLedger.filter((e) => e.type === bonusFilter);
  }, [memberLedger, bonusFilter]);

  const memberOrders = useMemo(
    () => orders.filter((o) => o.memberId === activeMemberId),
    [orders, activeMemberId]
  );

  const memberWithdrawals = useMemo(
    () => withdrawals.filter((w) => w.memberId === activeMemberId),
    [withdrawals, activeMemberId]
  );

  const directReferrals = useMemo(
    () => Object.values(members).filter((m) => m.sponsorId === activeMemberId),
    [members, activeMemberId]
  );

  const memberKyc = kycSubmissions.find((k) => k.memberId === activeMemberId);

  const currentRankIndex = Math.max(
    0,
    ranks.findIndex((r) => r.code === member.rankCode)
  );
  const currentRank = ranks[currentRankIndex] ?? ranks[0];
  const nextRank = ranks[currentRankIndex + 1];

  const rankProgressPercent = nextRank
    ? Math.min(
        100,
        Math.round(
          ((Math.min(member.leftTeamPv, member.rightTeamPv) /
            Math.max(1, nextRank.requiredLeftPv)) *
            100)
        )
      )
    : 100;

  const referralUrl = `https://nexusglobalplc.com/join?ref=${member.memberId}`;

  if (!canAccess) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#13204A]">{t(locale, 'memberHeading')}</h1>
        <p className="text-sm text-slate-600">{t(locale, 'permissionDenied')}</p>
        <button
          type="button"
          onClick={onOpenKyc}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-[#13204A] rounded-md cursor-pointer"
        >
          {t(locale, 'becomeMember')}
        </button>
      </div>
    );
  }

  const toggleNode = (nodeId: string) => {
    setExpandedNodeIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  const renderTreeNode = (nodeId: string, depth = 0) => {
    const node = members[nodeId];
    if (!node) return null;
    const isExpanded = expandedNodeIds.includes(nodeId);
    const hasChildren = node.childrenIds.length > 0;

    return (
      <div key={node.memberId} className={depth > 0 ? 'ml-5 sm:ml-8 pl-4 border-l border-slate-200 mt-2' : ''}>
        <div className="bg-white border border-slate-200 rounded-md p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleNode(node.memberId)}
                className="p-1 text-slate-500 hover:text-[#13204A] cursor-pointer"
                aria-label={isExpanded ? t(locale, 'collapseTeam') : t(locale, 'expandTeam')}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <span className="w-6 inline-block" />
            )}
            <div>
              <p className="text-sm font-semibold text-[#13204A]">
                {node.name}{' '}
                <span className="font-mono text-xs text-slate-500">({node.memberId})</span>
              </p>
              <p className="text-xs text-slate-500">
                {node.placementSide} · {node.rankCode} · KYC: {node.kycStatus}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
            <span>Self: {formatPV(node.personalPv, locale)}</span>
            <span className="text-slate-400">·</span>
            <span>L: {formatPV(node.leftTeamPv, locale)}</span>
            <span className="text-slate-400">·</span>
            <span>R: {formatPV(node.rightTeamPv, locale)}</span>
            {hasChildren && !isExpanded && (
              <button
                type="button"
                onClick={() => toggleNode(node.memberId)}
                className="text-[#E8892B] font-sans font-semibold hover:underline cursor-pointer"
              >
                {t(locale, 'expandTeam')}
              </button>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="mt-2 space-y-2">
            {node.childrenIds.map((childId) => renderTreeNode(childId, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleWithdrawalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const taka = Number(wdTaka);
    if (!Number.isFinite(taka) || taka <= 0) {
      setWdFeedback(locale === 'bn' ? 'সঠিক পরিমাণ লিখুন।' : 'Enter a valid amount.');
      return;
    }
    const grossPaisa = Math.round(taka * 100);
    const err = onRequestWithdrawal(activeMemberId, wdMethod, wdAccount.trim(), grossPaisa);
    if (err) {
      setWdFeedback(err);
    } else {
      setWdFeedback(
        locale === 'bn'
          ? 'উত্তোলনের আবেদন জমা হয়েছে এবং ডাবল-এন্ট্রি লেজারে সংরক্ষিত হয়েছে।'
          : 'Withdrawal request submitted and reserved in the double-entry ledger.'
      );
      setWdTaka('500');
    }
  };

  const previewGrossPaisa = Math.max(0, Math.round((Number(wdTaka) || 0) * 100));
  const previewFeePaisa = calculatePercentagePaisa(previewGrossPaisa, settings.withdrawalFeePercent);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header & Member Identity */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-mono text-slate-500">
            {member.memberId} · KYC: {member.kycStatus}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#13204A] tracking-tight">
            {t(locale, 'memberHeading')} — {member.name}
          </h1>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto">
          {(
            [
              ['overview', t(locale, 'tabOverview')],
              ['network', t(locale, 'tabNetwork')],
              ['wallet', t(locale, 'tabWallet')],
              ['rank', t(locale, 'tabRankKyc')],
              [
                'addresses',
                `${locale === 'bn' ? 'ঠিকানা ও নোটিফিকেশন' : 'Addresses & Alerts'}${
                  unreadNotificationsCount > 0
                    ? ` (${formatNumber(unreadNotificationsCount, locale)})`
                    : ''
                }`,
              ],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === id
                  ? 'bg-white text-[#13204A] shadow-xs'
                  : 'text-slate-600 hover:text-[#13204A]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary Row (Flat single-elevation tabular grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
          <p className="text-xs text-slate-500">{t(locale, 'walletBalance')}</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#13204A]">
            {formatBDT(walletBalancePaisa, locale)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
          <p className="text-xs text-slate-500">{t(locale, 'personalPv')}</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#E8892B]">
            {formatPV(member.personalPv, locale)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
          <p className="text-xs text-slate-500">{t(locale, 'leftTeamPv')}</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#13204A]">
            {formatPV(member.leftTeamPv, locale)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
          <p className="text-xs text-slate-500">{t(locale, 'rightTeamPv')}</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#13204A]">
            {formatPV(member.rightTeamPv, locale)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1 col-span-2 lg:col-span-1">
          <p className="text-xs text-slate-500">{t(locale, 'currentRank')}</p>
          <p className="text-base font-bold text-[#13204A]">
            {locale === 'bn' ? currentRank.nameBn : currentRank.nameEn}
          </p>
        </div>
      </div>

      {/* TAB 1: Overview & Recent Orders */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Rank Progress Strip */}
          {nextRank && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#13204A]">
                  {locale === 'bn' ? currentRank.nameBn : currentRank.nameEn} →{' '}
                  {locale === 'bn' ? nextRank.nameBn : nextRank.nameEn}
                </span>
                <span className="font-mono tabular-nums text-slate-600">
                  {rankProgressPercent}% ({nextRank.note})
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded overflow-hidden">
                <div
                  className="h-full bg-[#E8892B] transition-all"
                  style={{ width: `${rankProgressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Member Orders Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#13204A]">
                {locale === 'bn' ? 'আমার অর্ডারসমূহ' : 'My Orders & Invoices'}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-[#F8FAFC]">
                    <th className="px-5 py-3 font-medium">Order ID</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">PV</th>
                    <th className="px-5 py-3 font-medium text-right">Total</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-mono font-semibold text-[#13204A]">
                        {order.id}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-500">
                        {order.createdAt.slice(0, 10)}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-700">
                        {order.status} · {order.pvCredited ? 'PV Credited' : 'PV Pending'}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-[#E8892B] font-semibold">
                        +{formatPV(order.totalPv, locale)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold text-[#13204A]">
                        {formatBDT(order.totalPaisa, locale)}
                      </td>
                      <td className="px-5 py-3 text-right space-x-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onTrackOrder(order.id)}
                          className="text-[#13204A] hover:text-[#E8892B] font-semibold cursor-pointer"
                        >
                          Invoice
                        </button>
                        <button
                          type="button"
                          onClick={() => onReorder(order)}
                          className="inline-flex items-center gap-1 text-slate-600 hover:text-[#13204A] font-medium cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{t(locale, 'reorder')}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: My Network (Referral Link, QR & Lazy-Loaded Binary Tree) */}
      {activeTab === 'network' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2 flex-1">
              <h2 className="text-base font-bold text-[#13204A]">
                Referral Link &amp; Sponsor ID
              </h2>
              <p className="text-xs text-slate-600">
                Share your Sponsor ID <strong className="font-mono text-[#13204A]">{member.memberId}</strong> so new partners confirm your name during sign-up.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <code className="px-3 py-2 text-xs font-mono bg-[#F8FAFC] border border-slate-200 rounded text-[#13204A]">
                  {referralUrl}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(referralUrl).catch(() => {});
                    setCopiedLink(true);
                    window.setTimeout(() => setCopiedLink(false), 1800);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? t(locale, 'copied') : t(locale, 'copyReferralLink')}</span>
                </button>
              </div>
            </div>
            <ReferralQrSvg seed={referralUrl} />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#13204A]">
              Lazy-Loaded Placement Tree (Click nodes to expand sub-teams)
            </h3>
            {renderTreeNode(activeMemberId, 0)}
          </div>

          {/* Direct Referrals Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#13204A]">
                {locale === 'bn' ? 'সরাসরি রেফারেল তালিকা' : 'Direct Referrals'} (
                {formatNumber(directReferrals.length, locale)})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-[#F8FAFC]">
                    <th className="px-4 py-3 font-medium">Member ID</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Side · Rank</th>
                    <th className="px-4 py-3 font-medium">KYC</th>
                    <th className="px-4 py-3 font-medium text-right">Personal PV</th>
                    <th className="px-4 py-3 font-medium text-right">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {directReferrals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                        {locale === 'bn'
                          ? 'এখনো কোনো সরাসরি রেফারেল যুক্ত হয়নি।'
                          : 'No direct referrals yet. Share your Sponsor ID above.'}
                      </td>
                    </tr>
                  ) : (
                    directReferrals.map((ref) => (
                      <tr key={ref.memberId}>
                        <td className="px-4 py-3 font-mono font-semibold text-[#13204A]">
                          {ref.memberId}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{ref.name}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {ref.placementSide} · {ref.rankCode}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">{ref.kycStatus}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-[#E8892B] font-semibold">
                          {formatPV(ref.personalPv, locale)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">
                          {ref.joinedAt}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Double-Entry Wallet Ledger & Withdrawals */}
      {activeTab === 'wallet' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-[#13204A]">Double-Entry Wallet Ledger</h2>
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded text-xs overflow-x-auto">
                {(['ALL', 'MATCHING', 'REFERENCE', 'RETAIL', 'ROYALTY', 'WITHDRAWAL'] as const).map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setBonusFilter(type)}
                      className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                        bonusFilter === type
                          ? 'bg-white text-[#13204A] shadow-xs font-semibold'
                          : 'text-slate-600'
                      }`}
                    >
                      {type}
                    </button>
                  )
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-[#F8FAFC]">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Rule / Provenance</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLedger.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                        {entry.createdAt.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-[#13204A]">
                        {entry.type}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{entry.ruleSummary}</td>
                      <td
                        className={`px-4 py-3 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                          entry.amountPaisa >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {entry.amountPaisa >= 0 ? '+' : ''}
                        {formatBDT(entry.amountPaisa, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Withdrawal Request Form */}
          <div className="lg:col-span-4 space-y-6">
            <form
              onSubmit={handleWithdrawalSubmit}
              className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
            >
              <h3 className="text-sm font-bold text-[#13204A]">
                {t(locale, 'requestWithdrawal')}
              </h3>
              <p className="text-xs text-slate-500">
                Min: {formatBDT(settings.minWithdrawalPaisa, locale)} · Fee:{' '}
                {settings.withdrawalFeePercent}% ({t(locale, 'todoConfirmTag')})
              </p>

              {wdFeedback && (
                <p className="text-xs bg-[#F8FAFC] border border-slate-200 rounded p-2.5 text-[#13204A]">
                  {wdFeedback}
                </p>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 block">
                  {t(locale, 'withdrawalMethod')}
                </label>
                <select
                  value={wdMethod}
                  onChange={(e) => setWdMethod(e.target.value as WithdrawalMethod)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
                >
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 block">
                  {t(locale, 'accountNumber')}
                </label>
                <input
                  type="text"
                  required
                  value={wdAccount}
                  onChange={(e) => setWdAccount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 block">
                  {t(locale, 'amountTaka')}
                </label>
                <input
                  type="number"
                  min={Math.ceil(settings.minWithdrawalPaisa / 100)}
                  value={wdTaka}
                  onChange={(e) => setWdTaka(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>

              <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100 font-mono tabular-nums">
                <div className="flex justify-between">
                  <span>Fee ({settings.withdrawalFeePercent}%)</span>
                  <span>-{formatBDT(previewFeePaisa, locale)}</span>
                </div>
                <div className="flex justify-between font-bold text-[#13204A]">
                  <span>Net Payout</span>
                  <span>{formatBDT(Math.max(0, previewGrossPaisa - previewFeePaisa), locale)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-xs font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md cursor-pointer"
              >
                {t(locale, 'submitWithdrawal')}
              </button>
            </form>

            {memberWithdrawals.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                <h4 className="text-xs font-bold text-[#13204A]">Recent Withdrawals</h4>
                <ul className="divide-y divide-slate-100 text-xs">
                  {memberWithdrawals.map((w) => (
                    <li key={w.id} className="py-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-mono font-semibold text-slate-800">
                          {w.id} · {w.method}
                        </p>
                        <p className="text-slate-500">{w.status}</p>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-[#13204A]">
                        {formatBDT(w.netAmountPaisa, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Rank Ladder & KYC Profile */}
      {activeTab === 'rank' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-bold text-[#13204A]">
                Rank Ladder (PSM → Nexus Ambassador · Admin-Editable)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-[#F8FAFC]">
                    <th className="px-4 py-3 font-medium">Rank</th>
                    <th className="px-4 py-3 font-medium text-right">Personal PV</th>
                    <th className="px-4 py-3 font-medium text-right">Left / Right PV</th>
                    <th className="px-4 py-3 font-medium text-right">Daily Cap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ranks.map((r) => (
                    <tr
                      key={r.code}
                      className={r.code === member.rankCode ? 'bg-[#E8892B]/10 font-semibold' : ''}
                    >
                      <td className="px-4 py-3 text-[#13204A]">
                        {locale === 'bn' ? r.nameBn : r.nameEn}{' '}
                        <span className="text-[11px] text-slate-400">({r.note})</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {formatPV(r.requiredPersonalPv, locale)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {formatPV(r.requiredLeftPv, locale)} / {formatPV(r.requiredRightPv, locale)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {formatBDT(r.matchingCapDailyPaisa, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-[#13204A]">KYC &amp; Identity Vault</h3>
            <p className="text-slate-600">
              Status: <strong className="font-mono text-[#13204A]">{member.kycStatus}</strong>
            </p>
            {memberKyc ? (
              <dl className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Masked NID</dt>
                  <dd className="font-mono font-semibold text-[#13204A]">{memberKyc.maskedNid}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Nominee</dt>
                  <dd className="font-medium text-slate-800">
                    {memberKyc.nomineeName} ({memberKyc.nomineeRelation})
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Vault Ref</dt>
                  <dd className="font-mono text-[11px] text-slate-400 truncate max-w-[160px]">
                    {memberKyc.encryptedNidToken}
                  </dd>
                </div>
              </dl>
            ) : (
              <button
                type="button"
                onClick={onOpenKyc}
                className="w-full py-2 text-xs font-semibold text-white bg-[#13204A] rounded-md cursor-pointer"
              >
                {t(locale, 'submitKyc')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Saved Address Book & Notifications */}
      {activeTab === 'addresses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Address Book CRUD */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#E8892B]" />
                <h2 className="text-sm font-bold text-[#13204A]">
                  {locale === 'bn' ? 'সংরক্ষিত ডেলিভারি ঠিকানা' : 'Saved Delivery Addresses'}
                </h2>
              </div>

              {savedAddresses.length === 0 ? (
                <p className="text-xs text-slate-500">
                  {locale === 'bn' ? 'কোনো ঠিকানা সংরক্ষিত নেই।' : 'No saved addresses yet.'}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {savedAddresses.map((addr) => (
                    <li key={addr.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-[#13204A]">
                          {addr.label} · {addr.recipientName}{' '}
                          <span className="font-mono text-slate-500">({addr.phone})</span>
                        </p>
                        <p className="text-slate-600">{addr.addressLine}</p>
                        <p className="text-slate-500">
                          {addr.upazilaName}, {addr.districtName}, {addr.divisionName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteAddress(addr.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                        aria-label="Delete address"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!addrLabel.trim() || !addrName.trim() || !addrLine.trim()) {
                  setAddrError(
                    locale === 'bn'
                      ? 'সব ঘর পূরণ করুন।'
                      : 'Please fill in label, recipient name, and street address.'
                  );
                  return;
                }
                if (!validateBdMobile(addrPhone)) {
                  setAddrError(
                    locale === 'bn'
                      ? 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন।'
                      : 'Enter a valid Bangladesh mobile number.'
                  );
                  return;
                }
                onAddAddress({
                  id: `ADDR-${Date.now().toString().slice(-4)}`,
                  label: addrLabel.trim(),
                  recipientName: addrName.trim(),
                  phone: addrPhone.trim(),
                  divisionId: addrDivision.id,
                  districtId: addrDistrict.id,
                  upazilaId: addrUpazila.id,
                  divisionName: addrDivision.en,
                  districtName: addrDistrict.en,
                  upazilaName: addrUpazila.en,
                  addressLine: addrLine.trim(),
                });
                setAddrLabel('');
                setAddrLine('');
                setAddrError('');
              }}
              className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
            >
              <h3 className="text-sm font-bold text-[#13204A]">
                {locale === 'bn' ? 'নতুন ঠিকানা যোগ করুন' : 'Add New Delivery Address'}
              </h3>
              {addrError && <p className="text-xs text-red-600">{addrError}</p>}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <input
                  type="text"
                  value={addrLabel}
                  onChange={(e) => setAddrLabel(e.target.value)}
                  placeholder={locale === 'bn' ? 'লেবেল (বাসা / অফিস)' : 'Label (Home / Office)'}
                  className="px-3 py-2 border border-slate-300 rounded-md"
                />
                <input
                  type="text"
                  value={addrName}
                  onChange={(e) => setAddrName(e.target.value)}
                  placeholder={locale === 'bn' ? 'প্রাপকের নাম' : 'Recipient Name'}
                  className="px-3 py-2 border border-slate-300 rounded-md"
                />
                <input
                  type="tel"
                  value={addrPhone}
                  onChange={(e) => setAddrPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="px-3 py-2 font-mono border border-slate-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <select
                  value={addrDivision.id}
                  onChange={(e) => {
                    const nextDiv = BD_DIVISIONS.find((d) => d.id === e.target.value) ?? BD_DIVISIONS[0];
                    setAddrDivId(nextDiv.id);
                    setAddrDistId(nextDiv.districts[0].id);
                    setAddrUpzId(nextDiv.districts[0].upazilas[0].id);
                  }}
                  className="px-2.5 py-2 border border-slate-300 rounded-md bg-white"
                >
                  {BD_DIVISIONS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {locale === 'bn' ? d.bn : d.en}
                    </option>
                  ))}
                </select>
                <select
                  value={addrDistrict.id}
                  onChange={(e) => {
                    const nextDist =
                      addrDivision.districts.find((d) => d.id === e.target.value) ??
                      addrDivision.districts[0];
                    setAddrDistId(nextDist.id);
                    setAddrUpzId(nextDist.upazilas[0].id);
                  }}
                  className="px-2.5 py-2 border border-slate-300 rounded-md bg-white"
                >
                  {addrDivision.districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {locale === 'bn' ? d.bn : d.en}
                    </option>
                  ))}
                </select>
                <select
                  value={addrUpazila.id}
                  onChange={(e) => setAddrUpzId(e.target.value)}
                  className="px-2.5 py-2 border border-slate-300 rounded-md bg-white"
                >
                  {addrDistrict.upazilas.map((u) => (
                    <option key={u.id} value={u.id}>
                      {locale === 'bn' ? u.bn : u.en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={addrLine}
                  onChange={(e) => setAddrLine(e.target.value)}
                  placeholder={locale === 'bn' ? 'বাড়ি, রোড, এলাকা' : 'House, Road, Area'}
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-md"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md cursor-pointer whitespace-nowrap"
                >
                  {locale === 'bn' ? 'ঠিকানা সংরক্ষণ' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>

          {/* Notifications Feed */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#E8892B]" />
                <h2 className="text-sm font-bold text-[#13204A]">
                  {locale === 'bn' ? 'নোটিফিকেশন' : 'Notifications'}
                </h2>
              </div>
              {unreadNotificationsCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllNotificationsRead}
                  className="text-xs font-semibold text-[#13204A] hover:text-[#E8892B] cursor-pointer"
                >
                  {locale === 'bn' ? 'সব পঠিত চিহ্নিত করুন' : 'Mark all read'}
                </button>
              )}
            </div>
            <ul className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`p-4 text-xs space-y-1 ${n.read ? 'bg-white' : 'bg-[#F8FAFC]'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#13204A]">
                      {locale === 'bn' ? n.titleBn : n.titleEn}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {n.category} · {n.createdAt.slice(0, 10)}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {locale === 'bn' ? n.bodyBn : n.bodyEn}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
