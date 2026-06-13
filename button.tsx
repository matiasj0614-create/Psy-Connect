import React, { useState } from 'react';
import { useSubmitContactRequest } from '@workspace/api-client-react';
import type { TherapistMatch, TherapyProfile } from '@workspace/api-client-react';

interface ContactModalProps {
  therapist: TherapistMatch;
  profile: TherapyProfile;
  onClose: () => void;
}

function getFirstName(name: string): string {
  const TITLES = new Set(['Dr.', 'Dr', 'Mr.', 'Mr', 'Ms.', 'Ms', 'Mrs.', 'Mrs', 'Prof.', 'Prof']);
  const stripped = name.replace(/,.*$/, '').trim();
  const parts = stripped.split(/\s+/);
  const first = parts.find(p => !TITLES.has(p));
  return first ?? parts[0] ?? name;
}

export function ContactModal({ therapist, profile, onClose }: ContactModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const submitContact = useSubmitContactRequest();
  const firstName = getFirstName(therapist.name);

  const validate = () => {
    const e: typeof errors = {};
    if (!userName.trim()) e.name = 'Please enter your name';
    if (!userEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) e.email = 'Please enter a valid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    submitContact.mutate({
      data: {
        therapistName: therapist.name,
        therapistProfileUrl: (therapist as any).profileUrl ?? undefined,
        userName: userName.trim(),
        userEmail: userEmail.trim(),
        userMessage: userMessage.trim() || undefined,
        profileSummary: profile.therapistSummary,
      },
    }, {
      onSuccess: () => setStep('success'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-[#faf7f2] rounded-t-[28px] shadow-xl animate-[slideUp_0.3s_ease]" style={{ maxHeight: '88vh', overflowY: 'auto' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#ccc8c0] rounded-full" />
        </div>

        {step === 'form' ? (
          <div className="px-5 pb-8 pt-2">
            <div className="text-[18px] font-serif text-[#2e2a25] mb-1">
              Connect with {firstName}
            </div>
            <div className="text-[13px] text-[#7a6f65] mb-4 leading-[1.5]">
              Your request and therapy profile will be sent to {firstName} through PsyConnect. They'll review it and reach out within 48 hours.
            </div>

            {/* Therapist mini-card */}
            <div className="flex items-center gap-3 bg-white border border-[#e0dbd3] rounded-2xl p-3 mb-5">
              {(therapist as any).photoUrl ? (
                <img
                  src={(therapist as any).photoUrl}
                  alt={therapist.name}
                  className="w-[44px] h-[44px] rounded-xl object-cover shrink-0"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div
                  className="w-[44px] h-[44px] rounded-xl flex items-center justify-center font-serif text-[16px] font-medium shrink-0"
                  style={{ background: therapist.color, color: therapist.textColor }}
                >
                  {therapist.initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-serif text-[15px] text-[#2e2a25]">{therapist.name}</div>
                <div className="text-[11.5px] text-[#7a6f65] truncate">{therapist.title}</div>
              </div>
              <div className="text-[12px] font-medium text-[#4a7c59] bg-[#e8f0eb] px-2.5 py-0.5 rounded-full shrink-0">
                {therapist.score}
              </div>
            </div>

            {/* What gets shared */}
            <div className="bg-[#f0ece4] rounded-xl p-3 mb-5 text-[12.5px] text-[#7a6f65] leading-[1.55]">
              <div className="text-[11px] font-medium uppercase tracking-[0.7px] text-[#c4956a] mb-1.5">What {firstName} will receive</div>
              <div className="italic">"{profile.therapistSummary?.slice(0, 140)}{(profile.therapistSummary?.length ?? 0) > 140 ? '…' : ''}"</div>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[12px] font-medium text-[#5a534d] mb-1.5">Your name</label>
                <input
                  type="text"
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-[13.5px] font-sans text-[#2e2a25] outline-none focus:border-[#8fb99a] placeholder:text-[#b0a89e] transition-colors ${errors.name ? 'border-[#e07b5a]' : 'border-[#ddd8d0]'}`}
                  placeholder="Your full name"
                  value={userName}
                  onChange={e => { setUserName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); }}
                />
                {errors.name && <div className="text-[11.5px] text-[#e07b5a] mt-1">{errors.name}</div>}
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#5a534d] mb-1.5">Your email</label>
                <input
                  type="email"
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-[13.5px] font-sans text-[#2e2a25] outline-none focus:border-[#8fb99a] placeholder:text-[#b0a89e] transition-colors ${errors.email ? 'border-[#e07b5a]' : 'border-[#ddd8d0]'}`}
                  placeholder="you@example.com"
                  value={userEmail}
                  onChange={e => { setUserEmail(e.target.value); setErrors(prev => ({ ...prev, email: undefined })); }}
                />
                {errors.email && <div className="text-[11.5px] text-[#e07b5a] mt-1">{errors.email}</div>}
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#5a534d] mb-1.5">
                  Message <span className="text-[#9a9088] font-normal">— optional</span>
                </label>
                <textarea
                  className="w-full px-3.5 py-2.5 bg-white border border-[#ddd8d0] rounded-xl text-[13.5px] font-sans text-[#2e2a25] outline-none focus:border-[#8fb99a] placeholder:text-[#b0a89e] resize-none transition-colors"
                  placeholder={`Add a personal note to ${firstName}…`}
                  rows={3}
                  value={userMessage}
                  onChange={e => setUserMessage(e.target.value)}
                />
              </div>

              <button
                className={`w-full py-3.5 rounded-2xl text-[15px] font-medium font-sans border-none transition-all ${
                  submitContact.isPending ? 'bg-[#8fb99a] cursor-wait text-white' : 'bg-[#4a7c59] hover:bg-[#3d6849] cursor-pointer text-white'
                }`}
                onClick={handleSubmit}
                disabled={submitContact.isPending}
              >
                {submitContact.isPending ? 'Sending…' : `Send request to ${firstName}`}
              </button>

              {submitContact.isError && (
                <div className="text-center text-[12.5px] text-[#e07b5a]">
                  Something went wrong — please try again.
                </div>
              )}

              <div className="text-center text-[11.5px] text-[#9a9088] leading-[1.4]">
                PsyConnect notifies {firstName} and forwards your profile. Your email is only shared with them.
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-10 pt-4 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-[#e8f0eb] rounded-full flex items-center justify-center mb-4">
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                <path d="M6 15l6 6 12-12" stroke="#4a7c59" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="font-serif text-[20px] text-[#2e2a25] mb-2">Request sent!</div>
            <div className="text-[13.5px] text-[#7a6f65] leading-[1.6] mb-6">
              We've notified <strong className="text-[#2e2a25]">{firstName}</strong> and sent them your therapy profile.
              They'll review it and reach out within <strong className="text-[#2e2a25]">48 hours</strong>.
            </div>
            <div className="w-full bg-[#f0ece4] rounded-2xl p-4 mb-6 text-left">
              <div className="text-[11px] font-medium uppercase tracking-[0.7px] text-[#c4956a] mb-2">What happens next</div>
              <div className="flex flex-col gap-2">
                {[
                  `${firstName} reviews your profile`,
                  'They confirm they can take new clients',
                  'PsyConnect connects you over email',
                  'You book your first session',
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-[12.5px] text-[#5a534d]">
                    <div className="w-5 h-5 rounded-full bg-[#4a7c59] text-white text-[10px] font-medium flex items-center justify-center shrink-0">{i + 1}</div>
                    {step}
                  </div>
                ))}
              </div>
            </div>
            <button
              className="w-full py-3 bg-[#4a7c59] text-white rounded-2xl text-[15px] font-medium border-none cursor-pointer hover:bg-[#3d6849] transition-colors"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
