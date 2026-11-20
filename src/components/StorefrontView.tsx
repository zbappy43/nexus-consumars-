import { useMemo, useState } from 'react';
import { ArrowRight, Check, Heart, Search, ShoppingBag, Star, X } from 'lucide-react';
import type {
  AuthSession,
  Locale,
  Product,
  ProductCategoryId,
  ProductVariant,
} from '../types/domain';
import { ASSET_URLS } from '../data/seedData';
import { t } from '../lib/i18n';
import { formatBDT, formatNumber, formatPV, isMemberPricingEligible } from '../lib/money';
import { ResilientImage } from './ResilientImage';

interface StorefrontViewProps {
  locale: Locale;
  products: Product[];
  session: AuthSession;
  wishlistIds: string[];
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (productId: string, variantId: string, quantity: number) => void;
  onAddReview: (productId: string, author: string, city: string, rating: number, comment: string) => void;
  onOpenAuth: (tab: 'login' | 'register' | 'kyc') => void;
  onGoToDealer: () => void;
}

const CATEGORIES: Array<{ id: ProductCategoryId; labelKey: Parameters<typeof t>[1] }> = [
  { id: 'all', labelKey: 'catAll' },
  { id: 'groceries', labelKey: 'catGroceries' },
  { id: 'personal_care', labelKey: 'catPersonalCare' },
  { id: 'household', labelKey: 'catHousehold' },
  { id: 'beverages', labelKey: 'catBeverages' },
  { id: 'fashion', labelKey: 'catFashion' },
];

export function StorefrontView({
  locale,
  products,
  session,
  wishlistIds,
  onToggleWishlist,
  onAddToCart,
  onAddReview,
  onOpenAuth,
  onGoToDealer,
}: StorefrontViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategoryId>('all');
  const [wishlistOnly, setWishlistOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'pv_desc'>('featured');
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [detailQty, setDetailQty] = useState(1);
  const [justAddedKey, setJustAddedKey] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const memberEligible = isMemberPricingEligible(session.role, session.kycStatus === 'APPROVED');
  const activeProduct = useMemo(
    () => (activeProductId ? products.find((p) => p.id === activeProductId) ?? null : null),
    [activeProductId, products]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      if (wishlistOnly && !wishlistIds.includes(p.id)) return false;
      if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
      if (!q) return true;
      const matchesName =
        p.nameEn.toLowerCase().includes(q) ||
        p.nameBn.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q);
      const matchesSku = p.variants.some((v) => v.sku.toLowerCase().includes(q));
      return matchesName || matchesSku;
    });

    return [...list].sort((a, b) => {
      const va = a.variants[0];
      const vb = b.variants[0];
      if (sortBy === 'price_asc') return va.mrpPaisa - vb.mrpPaisa;
      if (sortBy === 'price_desc') return vb.mrpPaisa - va.mrpPaisa;
      if (sortBy === 'pv_desc') return vb.pv - va.pv;
      return Number(b.featured) - Number(a.featured);
    });
  }, [products, selectedCategory, wishlistOnly, wishlistIds, searchQuery, sortBy]);

  const openDetail = (product: Product) => {
    setActiveProductId(product.id);
    setSelectedVariantId(product.variants[0].id);
    setDetailQty(1);
    setReviewComment('');
    setReviewRating(5);
  };

  const handleQuickAdd = (product: Product) => {
    const firstInStock = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
    if (!firstInStock || firstInStock.stock <= 0) return;
    onAddToCart(product.id, firstInStock.id, 1);
    setJustAddedKey(product.id);
    window.setTimeout(() => setJustAddedKey((curr) => (curr === product.id ? null : curr)), 1200);
  };

  const activeVariant: ProductVariant | undefined = activeProduct
    ? activeProduct.variants.find((v) => v.id === selectedVariantId) ?? activeProduct.variants[0]
    : undefined;

  const relatedProducts = useMemo(() => {
    if (!activeProduct) return [];
    return products
      .filter((p) => p.id !== activeProduct.id && p.categoryId === activeProduct.categoryId)
      .slice(0, 3);
  }, [activeProduct, products]);

  return (
    <div className="space-y-16">
      {/* SECTION 1: Editorial Split Hero + Full-Width 4-Column Trust Strip */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            {/* Left Copy Column */}
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-xs font-semibold tracking-wide text-[#E8892B]">
                {t(locale, 'heroKicker')}
              </p>

              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-[#13204A] leading-[1.15]">
                {t(locale, 'heroTitle')}
              </h1>

              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                {t(locale, 'heroSubtitle')}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="#catalogue"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md transition-colors whitespace-nowrap"
                >
                  <span>{t(locale, 'heroPrimaryCta')}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => onOpenAuth('kyc')}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#13204A] border border-slate-300 hover:border-[#13204A] rounded-md transition-colors whitespace-nowrap cursor-pointer"
                >
                  {t(locale, 'heroSecondaryCta')}
                </button>
              </div>
            </div>

            {/* Right Media Column */}
            <div className="lg:col-span-6">
              <div className="h-full min-h-[260px] lg:min-h-[380px] rounded-lg overflow-hidden border border-slate-200 bg-[#F1F5F9]">
                <ResilientImage
                  src={ASSET_URLS.hero}
                  alt={t(locale, 'brandFull')}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* 4-Column Trust Strip below hero split */}
          <div className="mt-10 pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h2 className="text-sm font-semibold text-[#13204A]">{t(locale, 'trustCodTitle')}</h2>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">{t(locale, 'trustCodDesc')}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#13204A]">{t(locale, 'trustGenuineTitle')}</h2>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">{t(locale, 'trustGenuineDesc')}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#13204A]">{t(locale, 'trustFastTitle')}</h2>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">{t(locale, 'trustFastDesc')}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#13204A]">{t(locale, 'trustPvTitle')}</h2>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">{t(locale, 'trustPvDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Featured Consumer Catalogue with Search, Category Filter & Member/MRP/PV */}
      <section id="catalogue" className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#13204A] tracking-tight">
              {t(locale, 'catalogHeading')}
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              {t(locale, 'catalogSubheading')}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setWishlistOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border font-medium tabular-nums transition-colors cursor-pointer ${
                wishlistOnly
                  ? 'border-[#13204A] bg-[#13204A] text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-[#13204A]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${wishlistOnly ? 'fill-[#E8892B] text-[#E8892B]' : ''}`} />
              <span>
                {t(locale, 'wishlistCount')}: {formatNumber(wishlistIds.length, locale)}
              </span>
            </button>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          {/* Interactive Category Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-[#13204A] shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-[#13204A]'
                  }`}
                >
                  {t(locale, cat.labelKey)}
                </button>
              );
            })}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(locale, 'searchPlaceholder')}
                className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#13204A]"
              />
            </div>

            <select
              aria-label="Sort products"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-[#13204A] cursor-pointer"
            >
              <option value="featured">{t(locale, 'sortFeatured')}</option>
              <option value="price_asc">{t(locale, 'sortPriceAsc')}</option>
              <option value="price_desc">{t(locale, 'sortPriceDesc')}</option>
              <option value="pv_desc">{t(locale, 'sortPvDesc')}</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-4">
            <p className="text-sm text-slate-600">{t(locale, 'noProductsFound')}</p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setWishlistOnly(false);
                setSearchQuery('');
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#13204A] rounded-md cursor-pointer"
            >
              {t(locale, 'resetFilters')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filteredProducts.map((product) => {
              const primaryVariant = product.variants[0];
              const savingsPaisa = primaryVariant.mrpPaisa - primaryVariant.memberPricePaisa;
              const isWishlisted = wishlistIds.includes(product.id);
              const inStockTotal = product.variants.reduce((acc, v) => acc + v.stock, 0);
              const added = justAddedKey === product.id;

              return (
                <article
                  key={product.id}
                  className="group bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  {/* 4:3 Uniform Product Media */}
                  <div className="relative aspect-[4/3] bg-[#F1F5F9] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => openDetail(product)}
                      className="block w-full h-full text-left cursor-pointer"
                    >
                      <ResilientImage
                        src={product.imageUrl}
                        alt={locale === 'bn' ? product.nameBn : product.nameEn}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </button>

                    <button
                      type="button"
                      aria-label={t(locale, 'wishlistSaved')}
                      onClick={() => onToggleWishlist(product.id)}
                      className="absolute top-3 right-3 w-9 h-9 rounded-md bg-white/90 hover:bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#E8892B] transition-colors cursor-pointer"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isWishlisted ? 'fill-[#E8892B] text-[#E8892B]' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Clean Zero-Pill Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      {/* Unboxed Metadata Line */}
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{product.brand}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {inStockTotal > 10
                            ? t(locale, 'inStock')
                            : inStockTotal > 0
                            ? t(locale, 'lowStock')
                            : t(locale, 'outOfStock')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-600">
                          <Star className="w-3 h-3 fill-[#E8892B] text-[#E8892B]" />
                          {product.rating.toFixed(1)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => openDetail(product)}
                        className="text-left block cursor-pointer"
                      >
                        <h3 className="text-base font-semibold text-[#13204A] group-hover:text-[#E8892B] transition-colors leading-snug">
                          {locale === 'bn' ? product.nameBn : product.nameEn}
                        </h3>
                      </button>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {locale === 'bn' ? product.shortDescBn : product.shortDescEn}
                      </p>
                    </div>

                    {/* Tabular MRP / Member Price / PV Block */}
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold font-mono tabular-nums text-[#13204A]">
                              {formatBDT(
                                memberEligible
                                  ? primaryVariant.memberPricePaisa
                                  : primaryVariant.mrpPaisa,
                                locale
                              )}
                            </span>
                            {memberEligible && (
                              <span className="text-xs font-mono tabular-nums text-slate-400 line-through">
                                {formatBDT(primaryVariant.mrpPaisa, locale)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                            {memberEligible ? (
                              <>
                                {t(locale, 'memberPriceLabel')} ·{' '}
                                <span className="text-[#E8892B] font-semibold">
                                  +{formatPV(primaryVariant.pv, locale)}
                                </span>
                              </>
                            ) : (
                              <>
                                {t(locale, 'mrpLabel')} · {t(locale, 'memberPriceLabel')}{' '}
                                {formatBDT(primaryVariant.memberPricePaisa, locale)} ·{' '}
                                <span className="text-[#E8892B] font-semibold">
                                  +{formatPV(primaryVariant.pv, locale)}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {!memberEligible && (
                        <button
                          type="button"
                          onClick={() => onOpenAuth('kyc')}
                          className="text-left text-xs text-[#13204A]/80 hover:text-[#E8892B] transition-colors cursor-pointer"
                        >
                          {t(locale, 'guestTeaserPrefix')}{' '}
                          <span className="font-semibold font-mono tabular-nums">
                            {formatBDT(savingsPaisa, locale)}
                          </span>{' '}
                          +{' '}
                          <span className="font-semibold font-mono tabular-nums">
                            {formatPV(primaryVariant.pv, locale)}
                          </span>
                        </button>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={inStockTotal <= 0}
                          onClick={() => handleQuickAdd(product)}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] disabled:bg-slate-300 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                        >
                          {added ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#E8892B]" />
                              <span>{t(locale, 'addedToBag')}</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>{t(locale, 'addToBag')}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => openDetail(product)}
                          className="px-3.5 py-2.5 text-xs font-semibold text-[#13204A] border border-slate-300 hover:border-[#13204A] rounded-md transition-colors whitespace-nowrap cursor-pointer"
                        >
                          {t(locale, 'viewDetails')}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 3: Nexus Direct-Sales & Regional Network Story */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-10 space-y-8">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold text-[#E8892B]">{t(locale, 'storyKicker')}</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#13204A] tracking-tight">
              {t(locale, 'storyHeading')}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">{t(locale, 'storyBody')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[#13204A]">
                {t(locale, 'tierCustomerTitle')}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t(locale, 'tierCustomerDesc')}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[#13204A]">
                {t(locale, 'tierMemberTitle')}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t(locale, 'tierMemberDesc')}
              </p>
              <button
                type="button"
                onClick={() => onOpenAuth('kyc')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E8892B] hover:text-[#CF751C] pt-1 cursor-pointer"
              >
                <span>{t(locale, 'becomeMember')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[#13204A]">
                {t(locale, 'tierDealerTitle')}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t(locale, 'tierDealerDesc')}
              </p>
              <button
                type="button"
                onClick={onGoToDealer}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#13204A] hover:text-[#E8892B] pt-1 cursor-pointer"
              >
                <span>{t(locale, 'navDealer')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Product Detail Modal — Contiguous Purchase Module */}
      {activeProduct && activeVariant && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={locale === 'bn' ? activeProduct.nameBn : activeProduct.nameEn}
        >
          <div className="bg-white border border-slate-200 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                <span>{activeProduct.brand}</span>
                <span className="mx-2" aria-hidden="true">
                  /
                </span>
                <span className="font-mono">{activeVariant.sku}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveProductId(null)}
                className="p-1.5 text-slate-500 hover:text-[#13204A] rounded cursor-pointer"
                aria-label={t(locale, 'close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Left Gallery */}
              <div className="md:col-span-6 space-y-4">
                <div className="aspect-[4/3] rounded-md overflow-hidden border border-slate-200 bg-[#F1F5F9]">
                  <ResilientImage
                    src={activeProduct.imageUrl}
                    alt={locale === 'bn' ? activeProduct.nameBn : activeProduct.nameEn}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-semibold text-[#13204A]">
                    {t(locale, 'specifications')}
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {locale === 'bn' ? activeProduct.descriptionBn : activeProduct.descriptionEn}
                  </p>
                  <dl className="divide-y divide-slate-100 border-t border-b border-slate-200 text-xs">
                    {activeProduct.specs.map((spec) => (
                      <div key={spec.labelEn} className="py-2 flex justify-between gap-4">
                        <dt className="text-slate-500">
                          {locale === 'bn' ? spec.labelBn : spec.labelEn}
                        </dt>
                        <dd className="font-medium text-slate-900 text-right">
                          {locale === 'bn' ? spec.valueBn : spec.valueEn}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>

              {/* Right Contiguous Purchase Module */}
              <div className="md:col-span-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-[#13204A] leading-tight">
                    {locale === 'bn' ? activeProduct.nameBn : activeProduct.nameEn}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                    <span className="inline-flex items-center gap-1 text-slate-800 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-[#E8892B] text-[#E8892B]" />
                      {activeProduct.rating.toFixed(1)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {formatNumber(activeProduct.reviewCount, locale)} {t(locale, 'reviews')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {t(locale, 'skuLabel')}: {activeVariant.sku}
                    </span>
                  </div>
                </div>

                {/* Price & PV Breakdown */}
                <div className="bg-[#F8FAFC] border border-slate-200 rounded-md p-4 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500">{t(locale, 'mrpLabel')}</span>
                    <span
                      className={`font-mono tabular-nums ${
                        memberEligible
                          ? 'text-sm text-slate-400 line-through'
                          : 'text-xl font-bold text-[#13204A]'
                      }`}
                    >
                      {formatBDT(activeVariant.mrpPaisa, locale)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-medium text-[#13204A]">
                      {t(locale, 'memberPriceLabel')}
                    </span>
                    <span
                      className={`font-mono tabular-nums font-bold ${
                        memberEligible ? 'text-xl text-[#13204A]' : 'text-base text-[#13204A]'
                      }`}
                    >
                      {formatBDT(activeVariant.memberPricePaisa, locale)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-2 border-t border-slate-200">
                    <span className="text-xs text-slate-600">{t(locale, 'pvLabel')}</span>
                    <span className="text-sm font-bold font-mono tabular-nums text-[#E8892B]">
                      +{formatPV(activeVariant.pv, locale)}
                    </span>
                  </div>
                </div>

                {/* Variant Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 block">
                    {t(locale, 'selectVariant')}
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {activeProduct.variants.map((variant) => {
                      const selected = variant.id === activeVariant.id;
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => setSelectedVariantId(variant.id)}
                          className={`flex items-center justify-between px-3.5 py-2.5 rounded-md border text-xs transition-colors cursor-pointer ${
                            selected
                              ? 'border-[#13204A] bg-[#13204A]/5 text-[#13204A] font-semibold'
                              : 'border-slate-200 hover:border-slate-400 text-slate-700'
                          }`}
                        >
                          <span>{locale === 'bn' ? variant.labelBn : variant.labelEn}</span>
                          <span className="font-mono tabular-nums">
                            {formatBDT(
                              memberEligible ? variant.memberPricePaisa : variant.mrpPaisa,
                              locale
                            )}{' '}
                            · +{formatPV(variant.pv, locale)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity & Primary CTA */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="inline-flex items-center border border-slate-300 rounded-md">
                    <button
                      type="button"
                      onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                      className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-4 py-2 text-sm font-mono tabular-nums font-semibold">
                      {formatNumber(detailQty, locale)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDetailQty((q) => Math.min(activeVariant.stock, q + 1))}
                      className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={activeVariant.stock <= 0}
                    onClick={() => {
                      onAddToCart(activeProduct.id, activeVariant.id, detailQty);
                      setActiveProductId(null);
                    }}
                    className="flex-1 py-2.5 px-5 text-sm font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] disabled:bg-slate-300 rounded-md transition-colors cursor-pointer"
                  >
                    {t(locale, 'addToBag')}
                  </button>
                </div>

                {/* Reviews & Write a Review */}
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <h4 className="text-sm font-semibold text-[#13204A]">
                    {t(locale, 'reviews')} ({formatNumber(activeProduct.reviews.length, locale)})
                  </h4>
                  {activeProduct.reviews.length > 0 && (
                    <div className="space-y-3">
                      {activeProduct.reviews.map((rev) => (
                        <div key={rev.id} className="text-xs space-y-1">
                          <div className="flex items-center gap-2 text-slate-500">
                            <span className="font-semibold text-slate-800">{rev.author}</span>
                            <span aria-hidden="true">·</span>
                            <span>{rev.city}</span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-0.5 font-mono text-[#E8892B]">
                              <Star className="w-3 h-3 fill-[#E8892B] text-[#E8892B]" />
                              {rev.rating}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{rev.date}</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">
                            {locale === 'bn' ? rev.commentBn : rev.commentEn}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!reviewComment.trim()) return;
                      onAddReview(
                        activeProduct.id,
                        session.name || 'Customer',
                        'Bangladesh',
                        reviewRating,
                        reviewComment.trim()
                      );
                      setReviewComment('');
                      setReviewRating(5);
                    }}
                    className="bg-[#F8FAFC] border border-slate-200 rounded-md p-3 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#13204A]">
                        {locale === 'bn' ? 'রিভিউ লিখুন' : 'Write a Review'}
                      </span>
                      <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="p-0.5 cursor-pointer"
                            aria-label={`${star} star`}
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                star <= reviewRating
                                  ? 'fill-[#E8892B] text-[#E8892B]'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder={
                          locale === 'bn'
                            ? 'পণ্যটি কেমন লেগেছে লিখুন...'
                            : 'Share your experience with this product...'
                        }
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-[#13204A]"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded cursor-pointer whitespace-nowrap"
                      >
                        {locale === 'bn' ? 'জমা দিন' : 'Post'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Related Products */}
                {relatedProducts.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-500">
                      {t(locale, 'relatedProducts')}
                    </h4>
                    <div className="space-y-1.5">
                      {relatedProducts.map((rel) => (
                        <button
                          key={rel.id}
                          type="button"
                          onClick={() => openDetail(rel)}
                          className="w-full text-left flex items-center justify-between text-xs py-1.5 hover:text-[#E8892B] cursor-pointer"
                        >
                          <span className="font-medium text-[#13204A]">
                            {locale === 'bn' ? rel.nameBn : rel.nameEn}
                          </span>
                          <span className="font-mono tabular-nums text-slate-600">
                            {formatBDT(rel.variants[0].mrpPaisa, locale)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
