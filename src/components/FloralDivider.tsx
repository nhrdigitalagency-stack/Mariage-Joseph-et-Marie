import React from 'react';

export const FloralDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center my-6 ${className}`} aria-hidden="true">
    <svg
      width="220"
      height="24"
      viewBox="0 0 220 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[#EBAFC5]"
    >
      <path
        d="M10 12H85C92 12 96 6 102 6C106 6 108 9 110 12C112 9 114 6 118 6C124 6 128 12 135 12H210"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M85 12C92 12 96 18 102 18C106 18 108 15 110 12C112 15 114 18 118 18C124 18 128 12 135 12"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="110" cy="12" r="2.5" fill="#A93665" />
    </svg>
  </div>
);
