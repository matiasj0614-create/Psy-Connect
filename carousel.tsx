import React from 'react';

export function TypingIndicator() {
  return (
    <div className="bg-[#f0ece4] text-[#2e2a25] rounded-[18px] rounded-bl-[5px] py-[13px] px-[16px] flex gap-[5px] self-start animate-msg w-fit">
      <div className="w-[7px] h-[7px] rounded-full bg-[var(--sage-mid)] animate-bounce-dot" style={{ animationDelay: '0s' }}></div>
      <div className="w-[7px] h-[7px] rounded-full bg-[var(--sage-mid)] animate-bounce-dot" style={{ animationDelay: '0.2s' }}></div>
      <div className="w-[7px] h-[7px] rounded-full bg-[var(--sage-mid)] animate-bounce-dot" style={{ animationDelay: '0.4s' }}></div>
    </div>
  );
}
