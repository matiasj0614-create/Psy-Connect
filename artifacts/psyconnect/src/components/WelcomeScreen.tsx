import React from 'react';

interface WelcomeScreenProps {
  onStart: () => void;
  onProviderSignup: () => void;
}

export function WelcomeScreen({ onStart, onProviderSignup }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col justify-between h-full w-full">
      <div className="pt-6 px-6 flex items-center justify-between">
        <div>
          <div className="font-serif text-[20px] text-[#4a7c59] font-medium">Psy<span className="text-[#c4956a]">Connect</span></div>
          <div className="text-[11px] text-[#7a6f65] mt-[3px] font-light">Your guide to finding the right therapist</div>
        </div>
        <button
          onClick={onProviderSignup}
          className="text-[11.5px] text-[#4a7c59] font-medium bg-[#e8f0eb] border-none rounded-full px-3 py-1.5 cursor-pointer hover:bg-[#d4e6da] transition-colors font-sans"
        >
          For Providers
        </button>
      </div>

      <div className="px-6 flex-1 flex flex-col justify-center">
        <div className="w-16 h-16 bg-[#e8f0eb] rounded-[20px] flex items-center justify-center mb-[22px]">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 4C9.37 4 4 9.37 4 16c0 3.5 1.4 6.67 3.67 9L6 28l3.33-1.33C11.2 27.53 13.55 28 16 28c6.63 0 12-5.37 12-12S22.63 4 16 4z" fill="#4a7c59" opacity="0.2"/>
            <path d="M10 14h12M10 18h8" stroke="#4a7c59" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        <div className="font-serif text-[25px] text-[#2e2a25] leading-[1.3] mb-3">
          Find the therapist who's <em className="text-[#4a7c59] italic">right for you</em>
        </div>

        <div className="text-[13.5px] text-[#7a6f65] leading-[1.65] mb-5">
          Have a private, judgment-free conversation with Sage. We'll understand what you're going through and match you with therapists who genuinely fit.
        </div>

        <div className="flex flex-col gap-[9px] mb-6">
          {[
            { icon: "M12 2a5 5 0 100 10A5 5 0 0012 2zM2 20c0-4.4 4.5-8 10-8s10 3.6 10 8", label: "A private voice or text conversation with Sage" },
            { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", label: "Your personal therapy match profile" },
            { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0", label: "Connect directly with therapists through PsyConnect" },
            { icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", label: "Audio is never stored — your privacy protected" },
          ].map(({ icon, label }, i) => (
            <div key={i} className="flex items-start gap-[10px] text-[13px] text-[#8a7264]">
              <div className="w-[18px] h-[18px] rounded-full bg-[#e8f0eb] flex items-center justify-center shrink-0 mt-[1px]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={icon}/>
                </svg>
              </div>
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 pb-7">
        <div className="text-[11.5px] text-[#7a6f65] leading-[1.6] mb-4 py-3 px-3.5 bg-[#f0ece4] rounded-xl">
          PsyConnect is not a medical service and does not provide diagnoses. If you're in crisis, please contact <strong className="text-[#2e2a25]">988</strong> (Suicide & Crisis Lifeline).
        </div>
        <button
          className="w-full p-[15px] bg-[#4a7c59] text-white border-none rounded-2xl font-sans text-[15px] font-medium cursor-pointer hover:bg-[#3d6849] active:scale-[0.98] transition-all"
          onClick={onStart}
        >
          Start my conversation
        </button>
      </div>
    </div>
  );
}
