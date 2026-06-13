import React, { useState } from 'react';
import type { TherapyProfile, TherapistMatch } from '@workspace/api-client-react';
import { ContactModal } from './ContactModal';

interface ProfileScreenProps {
  profile: TherapyProfile;
  onBack: () => void;
}

function getFirstName(name: string): string {
  const TITLES = new Set(['Dr.', 'Dr', 'Mr.', 'Mr', 'Ms.', 'Ms', 'Mrs.', 'Mrs', 'Prof.', 'Prof', 'Rev.', 'Rev']);
  const stripped = name.replace(/,.*$/, '').trim();
  const parts = stripped.split(/\s+/);
  const first = parts.find(p => !TITLES.has(p));
  return first ?? parts[0] ?? name;
}

export function ProfileScreen({ profile, onBack }: ProfileScreenProps) {
  const [tab, setTab] = useState<'profile' | 'matches'>('profile');
  const [contactTarget, setContactTarget] = useState<TherapistMatch | null>(null);

  return (
    <>
      <div className="flex flex-col h-full w-full">
        <div className="bg-[#faf7f2] py-3.5 px-4 border-b-[0.5px] border-[#ddd8d0] flex items-center shrink-0">
          <button onClick={onBack} className="bg-transparent border-none cursor-pointer text-[#4a7c59] text-[13px] p-0 font-sans w-[60px] text-left">
            ← Back
          </button>
          <div className="flex-1 text-center">
            <div className="font-serif text-[16px] text-[#4a7c59] font-medium">Psy<span className="text-[#c4956a]">Connect</span></div>
          </div>
          <div className="w-[60px]"></div>
        </div>

        <div className="flex border-b-[0.5px] border-[#ddd8d0] mb-3.5 shrink-0">
          <div
            className={`flex-1 p-2.5 text-center text-[13px] cursor-pointer border-b-2 transition-all ${tab === 'profile' ? 'text-[#4a7c59] border-[#4a7c59] font-medium' : 'text-[#7a6f65] border-transparent'}`}
            onClick={() => setTab('profile')}
          >
            My Profile
          </div>
          <div
            className={`flex-1 p-2.5 text-center text-[13px] cursor-pointer border-b-2 transition-all ${tab === 'matches' ? 'text-[#4a7c59] border-[#4a7c59] font-medium' : 'text-[#7a6f65] border-transparent'}`}
            onClick={() => setTab('matches')}
          >
            Matches ({profile.therapists?.length || 0})
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {tab === 'profile' ? (
            <div className="flex flex-col gap-3">
              <div className="bg-white border-[0.5px] border-[#ddd8d0] rounded-[18px] p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.8px] text-[#c4956a] mb-2.5">Your profile</div>
                <div className="font-serif text-[22px] text-[#2e2a25] mb-1">{profile.name}</div>
                <div className="text-[13px] text-[#7a6f65] leading-[1.5]">{profile.tagline}</div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {profile.tags?.map((tag, i) => (
                    <div key={i} className={`px-2.5 py-1 rounded-full text-[12px] ${i % 2 === 0 ? 'bg-[#e8f0eb] text-[#4a7c59]' : 'bg-[#f5ede3] text-[#8a5e38]'}`}>
                      {tag}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border-[0.5px] border-[#ddd8d0] rounded-[18px] p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.8px] text-[#c4956a] mb-2.5">What you're working through</div>
                <div className="text-[13.5px] text-[#2e2a25] leading-[1.6]">{profile.challenges}</div>
              </div>

              <div className="bg-white border-[0.5px] border-[#ddd8d0] rounded-[18px] p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.8px] text-[#c4956a] mb-2.5">What to look for in a therapist</div>
                <div className="text-[13.5px] text-[#2e2a25] leading-[1.6]">{profile.recommendations}</div>
              </div>

              <div className="bg-white border-[0.5px] border-y-[#ddd8d0] border-r-[#ddd8d0] border-l-[3px] border-l-[#4a7c59] rounded-[18px] p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.8px] text-[#c4956a] mb-2.5">Summary for your therapist</div>
                <div className="text-[13px] text-[#7a6f65] leading-[1.6] italic">{profile.therapistSummary}</div>
                <div className="text-[11px] text-[#8a7264] mt-2.5">Sent to a therapist only when you tap Contact.</div>
              </div>

              <button
                className="w-full p-[15px] bg-[#4a7c59] text-white border-none rounded-2xl font-sans text-[15px] font-medium cursor-pointer hover:bg-[#3d6849] transition-colors mt-1"
                onClick={() => setTab('matches')}
              >
                See my therapist matches →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="text-[12px] text-[#7a6f65] mb-1 leading-[1.5]">
                Based on your conversation, here are your top matches. Tap Contact to reach out through PsyConnect.
              </div>
              {profile.therapists?.map((t, i) => (
                <TherapistCard
                  key={i}
                  therapist={t}
                  onContact={() => setContactTarget(t)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {contactTarget && (
        <ContactModal
          therapist={contactTarget}
          profile={profile}
          onClose={() => setContactTarget(null)}
        />
      )}
    </>
  );
}

function TherapistCard({ therapist: t, onContact }: { therapist: TherapistMatch; onContact: () => void }) {
  const firstName = getFirstName(t.name);
  const [photoFailed, setPhotoFailed] = useState(false);
  const photoUrl = (t as any).photoUrl as string | undefined;

  return (
    <div className="bg-white border-[0.5px] border-[#ddd8d0] rounded-[18px] p-3.5 relative">
      <div className="flex gap-3 mb-2.5">
        {photoUrl && !photoFailed ? (
          <img
            src={photoUrl}
            alt={t.name}
            className="w-[46px] h-[46px] rounded-xl object-cover shrink-0"
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <div
            className="w-[46px] h-[46px] rounded-xl flex items-center justify-center font-serif text-[16px] font-medium shrink-0"
            style={{ background: t.color || '#e8f0eb', color: t.textColor || '#4a7c59' }}
          >
            {t.initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-serif text-[17px] text-[#2e2a25] leading-tight">{t.name}</div>
          <div className="text-[11.5px] text-[#7a6f65] mt-0.5 leading-tight">{t.title}</div>
        </div>
        <div className="bg-[#e8f0eb] text-[#4a7c59] text-[11.5px] font-medium py-0.5 px-2.5 rounded-full shrink-0 self-start">
          {t.score}
        </div>
      </div>

      <div className="text-[12.5px] text-[#8a7264] leading-[1.5] bg-[#f0ece4] py-2 px-2.5 rounded-lg mb-2.5 italic">
        "{t.why}"
      </div>

      <div className="flex flex-col gap-1 mb-2.5">
        {t.fits?.map((fit, j) => (
          <div key={j} className="flex items-center gap-1.5 text-[12px] text-[#7a6f65]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#8fb99a] shrink-0"></div>
            {fit}
          </div>
        ))}
      </div>

      <button
        className="w-full mt-1 p-2.5 bg-[#4a7c59] text-white border-none rounded-xl text-[13px] font-medium cursor-pointer hover:bg-[#3d6849] transition-colors flex items-center justify-center gap-1.5"
        onClick={onContact}
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M7 1C3.69 1 1 3.69 1 7c0 1.75.7 3.33 1.83 4.5L2 13l1.67-.67C4.6 12.77 5.78 13 7 13c3.31 0 6-2.69 6-6S10.31 1 7 1z" fill="white" opacity="0.3"/>
          <path d="M4.5 6.5h5M4.5 8.5h3.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        Contact {firstName} via PsyConnect
      </button>
    </div>
  );
}
