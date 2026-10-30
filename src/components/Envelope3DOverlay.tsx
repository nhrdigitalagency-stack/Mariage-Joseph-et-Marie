import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Envelope3DOverlayProps {
  isOpen: boolean;
  onOpen: () => void;
  guestSubtitle?: string;
}

export const Envelope3DOverlay: React.FC<Envelope3DOverlayProps> = ({
  isOpen,
  onOpen,
  guestSubtitle,
}) => {
  const [openingStage, setOpeningStage] = useState<'idle' | 'opening'>('idle');

  const handleTriggerOpen = () => {
    if (openingStage === 'opening') return;
    setOpeningStage('opening');
    // Allow the 3D flap & letter rise animation to play smoothly before revealing the invitation
    setTimeout(() => {
      onOpen();
    }, 950);
  };

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45 } }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#1a0f15]/85 backdrop-blur-md overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Bienvenue au mariage de Joseph et Marie"
        >
          {/* Ambient soft radial rose glow behind the 3D envelope */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute w-72 h-72 sm:w-[480px] sm:h-[480px] rounded-full bg-[#A93665]/30 blur-3xl"
          />

          <motion.div
            initial={{ scale: 0.72, rotateX: 22, rotateY: -12, y: 50, opacity: 0 }}
            animate={
              openingStage === 'opening'
                ? { scale: 1.04, rotateX: 0, rotateY: 0, y: 10, opacity: 1 }
                : { scale: 1, rotateX: 6, rotateY: 0, y: 0, opacity: 1 }
            }
            exit={{ scale: 1.1, opacity: 0, y: -30 }}
            transition={{ type: 'spring', stiffness: 110, damping: 16 }}
            className="relative w-full max-w-xl my-auto perspective-1200"
          >
            {/* 3D ENVELOPE CONTAINER */}
            <div className="relative w-full min-h-[320px] sm:min-h-[420px] rounded-3xl bg-gradient-to-b from-[#FFF8FB] via-[#FFFFFF] to-[#F6D6E2] border-2 border-[#EBAFC5] shadow-[0_30px_90px_rgba(0,0,0,0.65),0_0_50px_rgba(235,175,197,0.35)] transform-style-3d flex flex-col justify-between p-4 sm:p-10 overflow-hidden">
              {/* Top 3D Envelope Triangular Flap */}
              <motion.div
                initial={{ rotateX: 0 }}
                animate={openingStage === 'opening' ? { rotateX: 180 } : { rotateX: 0 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: 'top center' }}
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-28 sm:h-40 pointer-events-none z-20"
              >
                <svg
                  viewBox="0 0 600 180"
                  preserveAspectRatio="none"
                  className="w-full h-full drop-shadow-[0_10px_18px_rgba(118,39,71,0.18)]"
                >
                  <defs>
                    <linearGradient id="envFlapGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#F6D6E2" />
                      <stop offset="100%" stopColor="#FFF8FB" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points="0,0 600,0 300,165"
                    fill="url(#envFlapGrad)"
                    stroke="#EBAFC5"
                    strokeWidth="3"
                  />
                </svg>
              </motion.div>

              {/* Subtle diagonal envelope side folds */}
              <svg
                aria-hidden="true"
                viewBox="0 0 600 420"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none opacity-45"
              >
                <line x1="0" y1="420" x2="230" y2="210" stroke="#EBAFC5" strokeWidth="2" />
                <line x1="600" y1="420" x2="370" y2="210" stroke="#EBAFC5" strokeWidth="2" />
              </svg>

              {/* Inner Rising Invitation Card */}
              <motion.div
                animate={
                  openingStage === 'opening'
                    ? { y: -24, scale: 1.02 }
                    : { y: 0, scale: 1 }
                }
                transition={{ duration: 0.6, delay: 0.15 }}
                className="relative z-30 my-auto mt-8 sm:mt-auto bg-white/95 backdrop-blur-xs border border-[#EEDDE5] rounded-2xl p-5 sm:p-8 text-center shadow-[0_14px_40px_rgba(118,39,71,0.12)]"
              >
                {/* Wax / Gold & Rose Monogram Seal */}
                <div className="mx-auto -mt-10 sm:-mt-12 mb-3 sm:mb-4 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#A93665] to-[#762747] border-2 border-[#F6D6E2] shadow-[0_6px_20px_rgba(169,54,101,0.45)] flex items-center justify-center text-white text-lg sm:text-xl font-semibold tracking-wider">
                  J &amp; M
                </div>

                {guestSubtitle && (
                  <p className="text-[11px] sm:text-xs font-medium text-[#A93665] tracking-widest uppercase mb-1.5 sm:mb-2">
                    {guestSubtitle}
                  </p>
                )}

                {/* Mandatory Envelope Text requested by User */}
                <h2
                  className="text-xl sm:text-3xl font-semibold text-[#30232B] leading-snug"
                  style={{ textWrap: 'balance' }}
                >
                  Bienvenue au mariage de Joseph et Marie
                </h2>

                <p className="text-xs sm:text-sm text-[#796670] mt-2">
                  Mardi 1er décembre 2026 · Yaoundé · Thème Rose &amp; Blanc
                </p>

                {/* Pink Neon Circumference "Ouvrir" Button */}
                <div className="mt-6 sm:mt-8 flex flex-col items-center justify-center">
                  <div className="neon-pink-ring">
                    <button
                      type="button"
                      onClick={handleTriggerOpen}
                      className="relative z-10 px-10 sm:px-12 py-3 sm:py-3.5 rounded-full bg-[#30232B] hover:bg-[#762747] text-white font-medium text-sm sm:text-base tracking-wide transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F6D6E2]"
                    >
                      <span>Ouvrir</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
