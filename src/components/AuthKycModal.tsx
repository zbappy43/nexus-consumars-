import { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, X } from 'lucide-react';
import type { AuthSession, KycSubmission, Locale, MemberNode } from '../types/domain';
import { t } from '../lib/i18n';
import { createEncryptedNidToken, maskNid, validateBdMobile } from '../lib/security';

interface AuthKycModalProps {
  open: boolean;
  initialTab: 'login' | 'register' | 'kyc';
  onClose: () => void;
  locale: Locale;
  session: AuthSession;
  members: Record<string, MemberNode>;
  onLoginSuccess: (session: AuthSession) => void;
  onRegisterMember: (name: string, mobile: string, sponsorId: string | null) => AuthSession;
  onSubmitKyc: (submission: KycSubmission) => void;
}

export function AuthKycModal({
  open,
  initialTab,
  onClose,
  locale,
  session,
  members,
  onLoginSuccess,
  onRegisterMember,
  onSubmitKyc,
}: AuthKycModalProps) {
  const [tab, setTab] = useState<'login' | 'register' | 'kyc'>(initialTab);
  const [mobile, setMobile] = useState(session.mobile || '01711223344');

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setFeedback('');
    }
  }, [open, initialTab]);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [sponsorId, setSponsorId] = useState('NCL-100001');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [feedback, setFeedback] = useState('');

  // KYC form state
  const [nidNumber, setNidNumber] = useState('');
  const [dob, setDob] = useState('1995-03-15');
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelation, setNomineeRelation] = useState('Spouse');
  const [nidFront, setNidFront] = useState('nid_front_scan.jpg');
  const [nidBack, setNidBack] = useState('nid_back_scan.jpg');
  const [selfie, setSelfie] = useState('applicant_selfie.jpg');

  if (!open) return null;

  const trimmedSponsor = sponsorId.trim().toUpperCase();
  const matchedSponsor = trimmedSponsor ? members[trimmedSponsor] : undefined;

  const handleSendOtp = () => {
    if (!validateBdMobile(mobile)) {
      setFeedback(
        locale === 'bn'
          ? 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন (01XXXXXXXXX)।'
          : 'Enter a valid Bangladesh mobile number (01XXXXXXXXX).'
      );
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(code);
    setOtpInput(code);
    setFeedback('');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBdMobile(mobile)) {
      setFeedback(locale === 'bn' ? 'সঠিক মোবাইল নম্বর দিন।' : 'Enter a valid mobile number.');
      return;
    }
    const existingMember = Object.values(members).find((m) => m.mobile === mobile.trim());
    if (existingMember) {
      onLoginSuccess({
        userId: existingMember.memberId,
        name: existingMember.name,
        mobile: existingMember.mobile,
        role: 'MEMBER',
        memberId: existingMember.memberId,
        kycStatus: existingMember.kycStatus,
      });
    } else {
      onLoginSuccess({
        userId: `CUST-${mobile.slice(-4)}`,
        name: 'Nexus Customer',
        mobile: mobile.trim(),
        role: 'CUSTOMER',
        kycStatus: 'NOT_SUBMITTED',
      });
    }
    onClose();
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !validateBdMobile(mobile)) {
      setFeedback(
        locale === 'bn' ? 'নাম ও সঠিক মোবাইল নম্বর পূরণ করুন।' : 'Enter full name and valid mobile.'
      );
      return;
    }
    if (!generatedOtp || otpInput.trim() !== generatedOtp) {
      setFeedback(
        locale === 'bn'
          ? 'প্রথমে ওটিপি পাঠান এবং সঠিক কোড যাচাই করুন।'
          : 'Please request and verify your mobile OTP first.'
      );
      return;
    }
    if (trimmedSponsor && !matchedSponsor) {
      setFeedback(t(locale, 'sponsorNotFound'));
      return;
    }

    const newSession = onRegisterMember(
      fullName.trim(),
      mobile.trim(),
      matchedSponsor ? matchedSponsor.memberId : null
    );
    onLoginSuccess(newSession);
    setTab('kyc');
    setFeedback(
      locale === 'bn'
        ? 'অ্যাকাউন্ট তৈরি হয়েছে! মেম্বার মূল্য ও পিভি পেতে এখন কেওয়াইসি জমা দিন।'
        : 'Account created! Submit KYC below to unlock Member pricing and PV.'
    );
  };

  const handleKycSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = nidNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      setFeedback(
        locale === 'bn'
          ? 'সঠিক ১০, ১৩ বা ১৭ সংখ্যার এনআইডি নম্বর দিন।'
          : 'Enter a valid 10, 13, or 17-digit Bangladesh NID number.'
      );
      return;
    }
    if (!nomineeName.trim()) {
      setFeedback(locale === 'bn' ? 'নমিনির নাম লিখুন।' : 'Enter nominee full name.');
      return;
    }

    const submission: KycSubmission = {
      id: `KYC-${Math.floor(3003 + Math.random() * 6900)}`,
      memberId: session.memberId || `NCL-${Math.floor(100010 + Math.random() * 899)}`,
      fullName: session.name || fullName || 'Nexus Applicant',
      mobile: session.mobile || mobile,
      maskedNid: maskNid(digits),
      encryptedNidToken: createEncryptedNidToken(digits),
      dateOfBirth: dob,
      nomineeName: nomineeName.trim(),
      nomineeRelation,
      nidFrontFile: `private-kyc/${session.memberId || 'new'}/${nidFront}`,
      nidBackFile: `private-kyc/${session.memberId || 'new'}/${nidBack}`,
      selfieFile: `private-kyc/${session.memberId || 'new'}/${selfie}`,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
    };

    onSubmitKyc(submission);
    setFeedback(
      locale === 'bn'
        ? `কেওয়াইসি (${submission.maskedNid}) জমা হয়েছে — অ্যাডমিন কেওয়াইসি রিভিউ কিউতে যুক্ত করা হয়েছে।`
        : `KYC (${submission.maskedNid}) submitted — now queued in Admin KYC Review.`
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={t(locale, 'authTitle')}
    >
      <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#13204A]">{t(locale, 'authTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-[#13204A] cursor-pointer"
            aria-label={t(locale, 'close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-md">
            {(
              [
                ['login', 'tabLogin'],
                ['register', 'tabRegister'],
                ['kyc', 'tabKyc'],
              ] as const
            ).map(([id, labelKey]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id);
                  setFeedback('');
                }}
                className={`py-2 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  tab === id
                    ? 'bg-white text-[#13204A] shadow-xs'
                    : 'text-slate-600 hover:text-[#13204A]'
                }`}
              >
                {t(locale, labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {feedback && (
            <div className="text-xs bg-[#F8FAFC] border border-slate-200 rounded-md p-3 text-[#13204A]">
              {feedback}
            </div>
          )}

          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 block">
                  {t(locale, 'mobileNumber')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="px-3.5 py-2 text-xs font-semibold text-[#13204A] border border-slate-300 hover:border-[#13204A] rounded-md whitespace-nowrap cursor-pointer"
                  >
                    {t(locale, 'sendOtp')}
                  </button>
                </div>
              </div>

              {generatedOtp && (
                <p className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                  {t(locale, 'otpDevHint')} <strong>{generatedOtp}</strong>
                </p>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 block">
                  Password or 6-Digit OTP
                </label>
                <input
                  type="text"
                  value={otpInput || password}
                  onChange={(e) => {
                    setOtpInput(e.target.value);
                    setPassword(e.target.value);
                  }}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-sm font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md cursor-pointer"
              >
                {t(locale, 'tabLogin')}
              </button>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 block">
                  {t(locale, 'fullName')}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 block">
                  {t(locale, 'mobileNumber')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="px-3.5 py-2 text-xs font-semibold text-[#13204A] border border-slate-300 hover:border-[#13204A] rounded-md whitespace-nowrap cursor-pointer"
                  >
                    {t(locale, 'sendOtp')}
                  </button>
                </div>
              </div>

              {generatedOtp && (
                <div className="space-y-2">
                  <p className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                    {t(locale, 'otpDevHint')} <strong>{generatedOtp}</strong>
                  </p>
                  <input
                    type="text"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
              )}

              {/* Sponsor / Referral ID with live Sponsor Name Confirmation */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 block">
                  {t(locale, 'sponsorIdOptional')}
                </label>
                <input
                  type="text"
                  value={sponsorId}
                  onChange={(e) => setSponsorId(e.target.value)}
                  placeholder="NCL-100001"
                  className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-md"
                />
                {trimmedSponsor && (
                  <p
                    className={`text-xs flex items-center gap-1.5 pt-1 ${
                      matchedSponsor ? 'text-emerald-700 font-medium' : 'text-red-600'
                    }`}
                  >
                    {matchedSponsor ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {t(locale, 'sponsorVerified')} {matchedSponsor.name} ({matchedSponsor.memberId})
                        </span>
                      </>
                    ) : (
                      <span>{t(locale, 'sponsorNotFound')}</span>
                    )}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-sm font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md cursor-pointer"
              >
                {t(locale, 'tabRegister')}
              </button>
            </form>
          )}

          {tab === 'kyc' && (
            <form onSubmit={handleKycSubmit} className="space-y-4">
              <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-[#F8FAFC] border border-slate-200 rounded-md p-3">
                <ShieldCheck className="w-4 h-4 text-[#13204A] shrink-0 mt-0.5" />
                <span>
                  NID numbers are encrypted at application level and always masked as{' '}
                  <span className="font-mono font-semibold">**** **** 1234</span>. KYC images are
                  stored in a private bucket served only via short-lived signed URLs.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 block">
                    {t(locale, 'nidLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    value={nidNumber}
                    onChange={(e) => setNidNumber(e.target.value)}
                    placeholder="1995481234567"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 block">
                    {t(locale, 'dobLabel')}
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 block">
                    {t(locale, 'nomineeNameLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    value={nomineeName}
                    onChange={(e) => setNomineeName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 block">
                    {t(locale, 'nomineeRelLabel')}
                  </label>
                  <select
                    value={nomineeRelation}
                    onChange={(e) => setNomineeRelation(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Child">Child</option>
                    <option value="Sibling">Sibling</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <label className="border border-slate-200 rounded p-2.5 space-y-1 cursor-pointer hover:border-[#13204A]">
                  <span className="font-medium text-slate-700 block">{t(locale, 'nidFrontLabel')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setNidFront(e.target.files?.[0]?.name || 'nid_front.jpg')}
                  />
                  <span className="font-mono text-[11px] text-slate-500 block truncate">{nidFront}</span>
                </label>
                <label className="border border-slate-200 rounded p-2.5 space-y-1 cursor-pointer hover:border-[#13204A]">
                  <span className="font-medium text-slate-700 block">{t(locale, 'nidBackLabel')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setNidBack(e.target.files?.[0]?.name || 'nid_back.jpg')}
                  />
                  <span className="font-mono text-[11px] text-slate-500 block truncate">{nidBack}</span>
                </label>
                <label className="border border-slate-200 rounded p-2.5 space-y-1 cursor-pointer hover:border-[#13204A]">
                  <span className="font-medium text-slate-700 block">{t(locale, 'selfieLabel')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setSelfie(e.target.files?.[0]?.name || 'selfie.jpg')}
                  />
                  <span className="font-mono text-[11px] text-slate-500 block truncate">{selfie}</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-sm font-semibold text-white bg-[#13204A] hover:bg-[#0E1838] rounded-md cursor-pointer"
              >
                {t(locale, 'submitKyc')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
