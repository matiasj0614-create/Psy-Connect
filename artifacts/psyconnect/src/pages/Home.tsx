import React, { useState } from 'react';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { ChatScreen } from '@/components/ChatScreen';
import { ProfileScreen } from '@/components/ProfileScreen';
import { ProviderSignupScreen } from '@/components/ProviderSignupScreen';
import { useGenerateProfile, type TherapyProfile, type SageChatMessage } from '@workspace/api-client-react';

type Screen = 'welcome' | 'chat' | 'profile' | 'provider';

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [profile, setProfile] = useState<TherapyProfile | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(false);

  const generateProfile = useGenerateProfile();

  const handleChatComplete = (history: SageChatMessage[]) => {
    setIsGenerating(true);
    setGenerateError(false);
    generateProfile.mutate({ data: { history } }, {
      onSuccess: (data) => {
        setProfile(data);
        setIsGenerating(false);
        setCurrentScreen('profile');
      },
      onError: () => {
        setIsGenerating(false);
        setGenerateError(true);
        setCurrentScreen('welcome');
      }
    });
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#f0ece4] py-4">
      <div className="w-[390px] h-[844px] max-h-[95dvh] bg-[#faf7f2] rounded-[36px] border-[1.5px] border-[#d4cfc8] overflow-hidden shadow-sm relative">

        {/* Profile generation overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-[#faf7f2]/90 backdrop-blur-sm z-50 flex items-center justify-center flex-col gap-4 px-8">
            <div className="w-10 h-10 rounded-full border-4 border-[#e8f0eb] border-t-[#4a7c59] animate-spin" />
            <div className="text-center">
              <div className="text-[#2e2a25] font-medium font-sans text-[15px] mb-1">Building your profile…</div>
              <div className="text-[#7a6f65] text-[13px]">Finding therapists who fit you</div>
            </div>
          </div>
        )}

        {/* Error toast */}
        {generateError && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-[#fff4f0] border border-[#f5c4b3] rounded-xl px-4 py-3 text-[13px] text-[#993c1d] flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#993c1d" strokeWidth="1"/>
              <path d="M7 4v4M7 10v.5" stroke="#993c1d" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Something went wrong generating your profile. Please try again.
          </div>
        )}

        {currentScreen === 'welcome' && (
          <WelcomeScreen
            onStart={() => { setGenerateError(false); setCurrentScreen('chat'); }}
            onProviderSignup={() => setCurrentScreen('provider')}
          />
        )}
        {currentScreen === 'chat' && (
          <ChatScreen
            onComplete={handleChatComplete}
            onSkip={() => setCurrentScreen('welcome')}
          />
        )}
        {currentScreen === 'profile' && profile && (
          <ProfileScreen profile={profile} onBack={() => setCurrentScreen('welcome')} />
        )}
        {currentScreen === 'provider' && (
          <ProviderSignupScreen onBack={() => setCurrentScreen('welcome')} />
        )}
      </div>
    </div>
  );
}
