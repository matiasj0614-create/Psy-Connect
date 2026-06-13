import React, { useState } from 'react';
import { useSubmitProviderApplication } from '@workspace/api-client-react';

interface ProviderSignupScreenProps {
  onBack: () => void;
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$49',
    period: '/month',
    tagline: 'For solo practitioners just getting started',
    features: ['Up to 5 client connections/mo', 'Verified PsyConnect listing', 'Client therapy profiles', 'Email notifications'],
    color: '#e8f0eb',
    accent: '#4a7c59',
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$99',
    period: '/month',
    tagline: 'For established therapists building their practice',
    features: ['Unlimited client connections', 'Priority matching placement', 'Client therapy profiles', 'SMS + email notifications', 'Practice analytics dashboard'],
    color: '#f5ede3',
    accent: '#c4956a',
    badge: 'Most popular',
  },
  {
    id: 'practice',
    name: 'Practice',
    price: '$199',
    period: '/month',
    tagline: 'For group practices and multi-provider clinics',
    features: ['Everything in Growth', 'Up to 5 providers per account', 'Group practice dashboard', 'Bulk client intake tools', 'Dedicated account support'],
    color: '#e8e4f0',
    accent: '#5a4a7c',
  },
];

const SPECIALTIES = [
  'Anxiety & Stress', 'Depression', 'Trauma & PTSD', 'Relationships & Couples',
  'ADHD', 'OCD', 'Grief & Loss', 'Life Transitions', 'Eating Disorders',
  'Burnout', 'Substance Use', 'Child & Adolescent', 'LGBTQ+ Issues', 'Identity & Self-esteem',
];

const MODALITIES = [
  'CBT', 'DBT', 'EMDR', 'ACT', 'IFS', 'Psychodynamic', 'Somatic', 'Mindfulness-Based',
  'Narrative', 'Person-Centered', 'Gottman Method', 'EFT',
];

export function ProviderSignupScreen({ onBack }: ProviderSignupScreenProps) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    name: '',
    credentials: '',
    email: '',
    specialty: '',
    modalities: [] as string[],
    location: '',
    telehealth: '',
    plan: 'growth',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submitApp = useSubmitProviderApplication();

  const set = (key: string, val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const toggleModality = (m: string) => {
    setForm(f => ({
      ...f,
      modalities: f.modalities.includes(m)
        ? f.modalities.filter(x => x !== m)
        : [...f.modalities, m],
    }));
  };

  const validateStep = () => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!form.name.trim()) e.name = 'Required';
      if (!form.credentials.trim()) e.credentials = 'Required';
      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    }
    if (step === 2) {
      if (!form.specialty) e.specialty = 'Please select your primary specialty';
      if (!form.telehealth) e.telehealth = 'Please choose a session format';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep(s => s + 1);
  };

  const handleSubmit = () => {
    submitApp.mutate({
      data: {
        name: form.name,
        credentials: form.credentials,
        email: form.email,
        specialty: form.specialty,
        modalities: form.modalities.join(', ') || undefined,
        location: form.location || undefined,
        telehealth: form.telehealth || undefined,
        plan: form.plan,
        message: form.message || undefined,
      },
    }, {
      onSuccess: () => setSubmitted(true),
    });
  };

  if (submitted) {
    return (
      <div className="flex flex-col h-full w-full">
        <div className="bg-[#faf7f2] py-3.5 px-4 border-b-[0.5px] border-[#ddd8d0] flex items-center shrink-0">
          <button onClick={onBack} className="bg-transparent border-none cursor-pointer text-[#4a7c59] text-[13px] p-0 font-sans">← Back</button>
          <div className="flex-1 text-center font-serif text-[16px] text-[#4a7c59] font-medium">Psy<span className="text-[#c4956a]">Connect</span></div>
          <div className="w-16" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="w-20 h-20 bg-[#e8f0eb] rounded-full flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M7 18l7 7 15-15" stroke="#4a7c59" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="font-serif text-[24px] text-[#2e2a25]">You're on the list!</div>
          <div className="text-[14px] text-[#7a6f65] leading-[1.65]">
            Thanks for applying to PsyConnect, <strong className="text-[#2e2a25]">{form.name.split(' ')[0]}</strong>.
            We're reviewing applications now and will reach out to <strong className="text-[#2e2a25]">{form.email}</strong> within 3–5 business days to set up your account on the <strong className="text-[#2e2a25]">{PLANS.find(p => p.id === form.plan)?.name}</strong> plan.
          </div>
          <div className="w-full bg-[#f0ece4] rounded-2xl p-4 text-left mt-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.7px] text-[#c4956a] mb-2.5">What comes next</div>
            {['We review your credentials', 'You activate your account', 'Your profile goes live in matching', 'Receive your first client connections'].map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 text-[13px] text-[#5a534d] mb-2">
                <div className="w-5 h-5 rounded-full bg-[#4a7c59] text-white text-[10px] font-medium flex items-center justify-center shrink-0">{i + 1}</div>
                {s}
              </div>
            ))}
          </div>
          <button
            onClick={onBack}
            className="w-full py-3.5 bg-[#4a7c59] text-white rounded-2xl text-[15px] font-medium border-none cursor-pointer hover:bg-[#3d6849] transition-colors mt-2"
          >
            Back to PsyConnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="bg-[#faf7f2] py-3.5 px-4 border-b-[0.5px] border-[#ddd8d0] flex items-center shrink-0">
        <button
          onClick={step === 1 ? onBack : () => setStep(s => s - 1)}
          className="bg-transparent border-none cursor-pointer text-[#4a7c59] text-[13px] p-0 font-sans w-[60px]"
        >
          ← Back
        </button>
        <div className="flex-1 text-center font-serif text-[16px] text-[#4a7c59] font-medium">Psy<span className="text-[#c4956a]">Connect</span></div>
        <div className="w-[60px] text-right text-[12px] text-[#9a9088]">{step} of 3</div>
      </div>

      {/* Step progress */}
      <div className="flex gap-1.5 px-4 pt-3.5 pb-2 shrink-0">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${s <= step ? 'bg-[#4a7c59]' : 'bg-[#e0dbd3]'}`} />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {/* Step 1 — Your info */}
        {step === 1 && (
          <div className="pt-2">
            <div className="font-serif text-[22px] text-[#2e2a25] mb-1">Join as a provider</div>
            <div className="text-[13px] text-[#7a6f65] mb-5 leading-[1.5]">
              Get matched with clients who are specifically looking for what you offer. Start with your basic info.
            </div>

            <Field label="Full name" error={errors.name}>
              <input type="text" className={inp(errors.name)} placeholder="Dr. Sarah Chen" value={form.name} onChange={e => set('name', e.target.value)} />
            </Field>
            <Field label="Credentials & license" error={errors.credentials} hint="e.g. PhD, LCSW, MFT, LPC">
              <input type="text" className={inp(errors.credentials)} placeholder="LCSW, Licensed in CA" value={form.credentials} onChange={e => set('credentials', e.target.value)} />
            </Field>
            <Field label="Email address" error={errors.email}>
              <input type="email" className={inp(errors.email)} placeholder="you@practice.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label="Anything you'd like us to know?" hint="Optional — open slot count, special circumstances, etc.">
              <textarea className={`${inp()} resize-none`} rows={3} placeholder="Optional message…" value={form.message} onChange={e => set('message', e.target.value)} />
            </Field>
          </div>
        )}

        {/* Step 2 — Practice details */}
        {step === 2 && (
          <div className="pt-2">
            <div className="font-serif text-[22px] text-[#2e2a25] mb-1">Your practice</div>
            <div className="text-[13px] text-[#7a6f65] mb-5 leading-[1.5]">
              This helps us match you with the right clients. You can update these anytime after joining.
            </div>

            <Field label="Primary specialty" error={errors.specialty}>
              <div className="flex flex-wrap gap-1.5">
                {SPECIALTIES.map(s => (
                  <button
                    key={s}
                    className={`py-1.5 px-3 rounded-full text-[12px] font-sans border-[0.5px] cursor-pointer transition-all ${
                      form.specialty === s ? 'bg-[#4a7c59] text-white border-[#4a7c59]' : 'bg-[#f0ece4] text-[#5a534d] border-[#ccc8c0] hover:border-[#8fb99a]'
                    }`}
                    onClick={() => set('specialty', s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Therapeutic approaches" hint="Select all that apply">
              <div className="flex flex-wrap gap-1.5">
                {MODALITIES.map(m => (
                  <button
                    key={m}
                    className={`py-1 px-2.5 rounded-full text-[11.5px] font-sans border-[0.5px] cursor-pointer transition-all ${
                      form.modalities.includes(m) ? 'bg-[#4a7c59] text-white border-[#4a7c59]' : 'bg-white text-[#5a534d] border-[#ccc8c0] hover:border-[#8fb99a]'
                    }`}
                    onClick={() => toggleModality(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Session format" error={errors.telehealth}>
              <div className="flex gap-2">
                {[['in-person', 'In-person only'], ['telehealth', 'Telehealth only'], ['both', 'Both']].map(([val, label]) => (
                  <button
                    key={val}
                    className={`flex-1 py-2 rounded-xl text-[12.5px] font-sans border cursor-pointer transition-all ${
                      form.telehealth === val ? 'bg-[#4a7c59] text-white border-[#4a7c59]' : 'bg-white text-[#5a534d] border-[#ddd8d0] hover:border-[#8fb99a]'
                    }`}
                    onClick={() => set('telehealth', val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Practice location" hint="City, state — leave blank if telehealth only">
              <input type="text" className={inp()} placeholder="San Francisco, CA" value={form.location} onChange={e => set('location', e.target.value)} />
            </Field>
          </div>
        )}

        {/* Step 3 — Choose plan */}
        {step === 3 && (
          <div className="pt-2">
            <div className="font-serif text-[22px] text-[#2e2a25] mb-1">Choose your plan</div>
            <div className="text-[13px] text-[#7a6f65] mb-4 leading-[1.5]">
              Join the waitlist — no charge until your account is activated. Cancel anytime.
            </div>

            <div className="flex flex-col gap-3 mb-5">
              {PLANS.map(plan => (
                <div
                  key={plan.id}
                  className={`border rounded-2xl p-4 cursor-pointer transition-all ${
                    form.plan === plan.id ? 'border-[#4a7c59] shadow-[0_0_0_2px_#4a7c5940]' : 'border-[#ddd8d0] hover:border-[#8fb99a]'
                  }`}
                  style={{ background: form.plan === plan.id ? plan.color : 'white' }}
                  onClick={() => set('plan', plan.id)}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-[17px] font-medium text-[#2e2a25]">{plan.name}</span>
                        {plan.badge && (
                          <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full" style={{ background: plan.accent, color: 'white' }}>
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11.5px] text-[#7a6f65] mt-0.5">{plan.tagline}</div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="text-[20px] font-serif font-medium text-[#2e2a25]">{plan.price}</span>
                      <span className="text-[11px] text-[#7a6f65]">{plan.period}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-[12px] text-[#5a534d]">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: plan.accent }} />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center text-[11.5px] text-[#9a9088] mb-4 leading-[1.4]">
              Your card won't be charged until your account is activated. We'll email you first.
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-4 pb-5 pt-2 border-t-[0.5px] border-[#ddd8d0] bg-[#faf7f2] shrink-0">
        <button
          className={`w-full py-3.5 rounded-2xl text-[15px] font-medium font-sans border-none transition-all ${
            submitApp.isPending ? 'bg-[#8fb99a] text-white cursor-wait' : 'bg-[#4a7c59] text-white hover:bg-[#3d6849] cursor-pointer'
          }`}
          onClick={step < 3 ? handleNext : handleSubmit}
          disabled={submitApp.isPending}
        >
          {step < 3 ? 'Continue →' : submitApp.isPending ? 'Submitting…' : 'Join the waitlist'}
        </button>
        {submitApp.isError && (
          <div className="text-center text-[12.5px] text-[#e07b5a] mt-2">Something went wrong — please try again.</div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, error, hint }: { label: string; children: React.ReactNode; error?: string; hint?: string }) {
  return (
    <div className="mb-4">
      <label className="block text-[12.5px] font-medium text-[#5a534d] mb-1.5">
        {label}
        {hint && <span className="text-[#9a9088] font-normal ml-1">— {hint}</span>}
      </label>
      {children}
      {error && <div className="text-[11.5px] text-[#e07b5a] mt-1">{error}</div>}
    </div>
  );
}

function inp(error?: string) {
  return `w-full px-3.5 py-2.5 bg-white border rounded-xl text-[13.5px] font-sans text-[#2e2a25] outline-none focus:border-[#8fb99a] placeholder:text-[#b0a89e] transition-colors ${error ? 'border-[#e07b5a]' : 'border-[#ddd8d0]'}`;
}
