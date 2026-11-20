export type Locale = 'bn' | 'en';

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'FINANCE'
  | 'INVENTORY_MANAGER'
  | 'ORDER_MANAGER'
  | 'KYC_OFFICER'
  | 'SUPPORT'
  | 'DEALER'
  | 'MEMBER'
  | 'CUSTOMER';

export type Permission =
  | 'catalog:manage'
  | 'inventory:manage'
  | 'orders:manage'
  | 'orders:assign_dealer'
  | 'kyc:review'
  | 'commission:run'
  | 'commission:approve'
  | 'withdrawals:approve'
  | 'settings:manage'
  | 'audit:view'
  | 'dealer:portal'
  | 'member:portal';

export type ProductCategoryId =
  | 'all'
  | 'groceries'
  | 'personal_care'
  | 'household'
  | 'beverages'
  | 'fashion';

export interface ProductVariant {
  id: string;
  sku: string;
  labelEn: string;
  labelBn: string;
  weightGrams: number;
  /** Stored as integer paisa (100 paisa = ৳1). Never float. */
  mrpPaisa: number;
  /** Stored as integer paisa (100 paisa = ৳1). Never float. */
  memberPricePaisa: number;
  /** Fixed integer Point Value (PV). */
  pv: number;
  stock: number;
}

export interface ProductReview {
  id: string;
  author: string;
  city: string;
  rating: number;
  date: string;
  commentEn: string;
  commentBn: string;
}

export interface Product {
  id: string;
  slug: string;
  categoryId: Exclude<ProductCategoryId, 'all'>;
  brand: string;
  nameEn: string;
  nameBn: string;
  shortDescEn: string;
  shortDescBn: string;
  descriptionEn: string;
  descriptionBn: string;
  imageUrl: string;
  featured: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  rating: number;
  reviewCount: number;
  specs: Array<{ labelEn: string; labelBn: string; valueEn: string; valueBn: string }>;
  variants: ProductVariant[];
  reviews: ProductReview[];
}

export interface CartItem {
  productId: string;
  variantId: string;
  quantity: number;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'REFUNDED';

export type PaymentMethod = 'COD' | 'BKASH' | 'NAGAD' | 'SSLCOMMERZ';
export type PaymentStatus = 'UNPAID' | 'SANDBOX_VERIFIED' | 'PAID' | 'REFUNDED';

export interface OrderItemSnapshot {
  productId: string;
  variantId: string;
  sku: string;
  nameEn: string;
  nameBn: string;
  variantLabelEn: string;
  variantLabelBn: string;
  quantity: number;
  /** Snapshotted at purchase time in integer paisa */
  unitMrpPaisa: number;
  unitMemberPricePaisa: number;
  unitChargedPaisa: number;
  unitPv: number;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  at: string;
  actor: string;
  note: string;
}

export interface Order {
  id: string;
  idempotencyKey: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  memberId?: string;
  buyerRole: Role;
  division: string;
  district: string;
  upazila: string;
  addressLine: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  gatewayTxId?: string;
  status: OrderStatus;
  assignedDealerId?: string;
  channel: 'STOREFRONT' | 'DEALER_POS';
  couponCode?: string;
  subtotalPaisa: number;
  discountPaisa: number;
  deliveryChargePaisa: number;
  totalPaisa: number;
  totalPv: number;
  pvCredited: boolean;
  pvReversed: boolean;
  items: OrderItemSnapshot[];
  history: OrderStatusEvent[];
}

export type KycStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface KycSubmission {
  id: string;
  memberId: string;
  fullName: string;
  mobile: string;
  /** Masked NID for UI display only (e.g., **** **** 1234) */
  maskedNid: string;
  /** Encrypted vault token (never plain NID) */
  encryptedNidToken: string;
  dateOfBirth: string;
  nomineeName: string;
  nomineeRelation: string;
  nidFrontFile: string;
  nidBackFile: string;
  selfieFile: string;
  status: Exclude<KycStatus, 'NOT_SUBMITTED'>;
  rejectionReason?: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface MemberNode {
  memberId: string;
  name: string;
  mobile: string;
  rankCode: string;
  sponsorId: string | null;
  placementParentId: string | null;
  placementSide: 'LEFT' | 'RIGHT' | 'ROOT';
  personalPv: number;
  leftTeamPv: number;
  rightTeamPv: number;
  joinedAt: string;
  kycStatus: KycStatus;
  childrenIds: string[];
}

export type BonusType = 'MATCHING' | 'REFERENCE' | 'RETAIL' | 'ROYALTY' | 'DEALER' | 'WITHDRAWAL';

export interface WalletLedgerEntry {
  id: string;
  memberId: string;
  createdAt: string;
  type: BonusType;
  /** Positive for credit, negative for debit (integer paisa) */
  amountPaisa: number;
  idempotencyKey: string;
  sourceOrderId?: string;
  sourceMemberId?: string;
  ruleSummary: string;
  commissionRunId?: string;
}

export type WithdrawalMethod = 'BKASH' | 'NAGAD' | 'BANK';
export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';

export interface WithdrawalRequest {
  id: string;
  memberId: string;
  memberName: string;
  method: WithdrawalMethod;
  accountNumber: string;
  grossAmountPaisa: number;
  feePaisa: number;
  netAmountPaisa: number;
  status: WithdrawalStatus;
  txReference?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface RankConfig {
  code: string;
  nameEn: string;
  nameBn: string;
  requiredPersonalPv: number;
  requiredLeftPv: number;
  requiredRightPv: number;
  /** TODO: confirm with Nexus management */
  matchingCapDailyPaisa: number;
  note: string;
}

export interface CommissionRunItem {
  memberId: string;
  memberName: string;
  bonusType: Exclude<BonusType, 'WITHDRAWAL'>;
  basisPv: number;
  ratePercent: number;
  grossPaisa: number;
  tdsPaisa: number;
  netPaisa: number;
  explanation: string;
}

export interface CommissionRun {
  id: string;
  periodLabel: string;
  status: 'DRY_RUN' | 'APPROVED' | 'LOCKED';
  createdAt: string;
  lockedAt?: string;
  totalNetPaisa: number;
  items: CommissionRunItem[];
}

export interface DealerStockItem {
  variantId: string;
  sku: string;
  productNameEn: string;
  productNameBn: string;
  variantLabel: string;
  quantity: number;
  reorderThreshold: number;
  mrpPaisa: number;
  memberPricePaisa: number;
  pv: number;
}

export interface DealerRequisition {
  id: string;
  dealerId: string;
  sku: string;
  productName: string;
  requestedQty: number;
  status: 'PENDING' | 'APPROVED' | 'DISPATCHED';
  createdAt: string;
}

export interface Coupon {
  code: string;
  type: 'PERCENT' | 'FLAT';
  /** Percent (e.g., 10) or flat integer paisa */
  value: number;
  minOrderPaisa: number;
  active: boolean;
  labelEn: string;
  labelBn: string;
}

export interface SiteSettings {
  deliveryInsideDhakaPaisa: number;
  deliveryOutsideDhakaPaisa: number;
  deliveryKishoreganjPaisa: number;
  freeDeliveryThresholdPaisa: number;
  minWithdrawalPaisa: number;
  withdrawalFeePercent: number;
  tdsPercent: number;
  /** Configuration-driven commission rates (TODO: confirm) */
  referenceBonusPercent: number;
  matchingBonusPerPvPaisa: number;
  dealerCommissionPercent: number;
  supportPhone: string;
  supportEmail: string;
}

export interface AuditLogEntry {
  id: string;
  at: string;
  actorName: string;
  actorRole: Role;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
}

export interface SavedAddress {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  divisionId: string;
  districtId: string;
  upazilaId: string;
  divisionName: string;
  districtName: string;
  upazilaName: string;
  addressLine: string;
  isDefault?: boolean;
}

export interface NotificationItem {
  id: string;
  createdAt: string;
  titleEn: string;
  titleBn: string;
  bodyEn: string;
  bodyBn: string;
  read: boolean;
  category: 'ORDER' | 'KYC' | 'WALLET' | 'SYSTEM';
}

export interface DealerApplication {
  id: string;
  applicantName: string;
  mobile: string;
  businessName: string;
  tradeLicenseNo: string;
  maskedNid: string;
  division: string;
  district: string;
  upazila: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
}

export interface AuthSession {
  userId: string;
  name: string;
  mobile: string;
  role: Role;
  memberId?: string;
  dealerId?: string;
  kycStatus: KycStatus;
}

export type AppSection = 'store' | 'member' | 'dealer' | 'admin' | 'track';
export type CmsPageKey = 'about' | 'contact' | 'privacy' | 'terms' | 'refund' | 'faq';

export type CmsContentMap = Record<CmsPageKey, { titleEn: string; titleBn: string; body: string }>;
