/**
 * WalletSelectModal Component
 *
 * Modal overlay for wallet selection.
 * - Freighter: fully functional — triggers extension prompt
 * - xBull / Passkey: disabled with "Coming soon" label
 * - Shows spinner while connecting
 * - Shows error + Retry on failure
 * - Auto-closes on successful connection
 */

"use client";

import { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";

// ── Spinner ────────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="wallet-modal-spinner"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ── Wallet option icons ────────────────────────────────────────────────────────

function FreighterIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="var(--accent-primary)" />
      <path d="M14 24h20M24 14v20" stroke="var(--bg-primary)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function XBullIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="var(--border-color)" />
      <text x="14" y="30" fontSize="16" fill="var(--text-muted)" fontWeight="bold">xB</text>
    </svg>
  );
}

function PasskeyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="var(--border-color)" />
      <circle cx="24" cy="20" r="5" stroke="var(--text-muted)" strokeWidth="2.5" />
      <path d="M14 36c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface WalletSelectModalProps {
  open: boolean;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function WalletSelectModal({ open, onClose }: WalletSelectModalProps) {
  const { connect, isConnecting, isConnected, error } = useWallet();

  // Auto-close when connection succeeds
  useEffect(() => {
    if (isConnected && open) {
      onClose();
    }
  }, [isConnected, open, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const handleFreighter = useCallback(async () => {
    await connect("freighter");
  }, [connect]);

  return (
    <AnimatePresence>
      {open && (
        /* Single backdrop — flex-centered so framer-motion y animation
           does not conflict with a CSS translate(-50%,-50%) centering trick */
        <motion.div
          className="wallet-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          aria-hidden="true"
        >
          {/* Panel sits inside the flex container — stop click propagating to backdrop */}
          <motion.div
            className="wallet-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-modal-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="wallet-modal-header">
              <h2 id="wallet-modal-title" className="wallet-modal-title">
                Connect Wallet
              </h2>
              <button
                className="wallet-modal-close"
                onClick={onClose}
                aria-label="Close modal"
                disabled={isConnecting}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Spinner overlay while connecting */}
            {isConnecting && (
              <div className="wallet-modal-connecting">
                <Spinner />
                <span>Connecting to Freighter…</span>
              </div>
            )}

            {/* Error state */}
            {error && !isConnecting && (
              <div className="wallet-modal-error" role="alert">
                <span>{error}</span>
                <button
                  id="wallet-modal-retry"
                  className="wallet-modal-retry-btn"
                  onClick={() => void handleFreighter()}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Wallet options */}
            {!isConnecting && (
              <div className="wallet-modal-options">
                {/* Freighter — active */}
                <button
                  id="wallet-option-freighter"
                  className="wallet-option wallet-option--active"
                  onClick={() => void handleFreighter()}
                  disabled={isConnecting}
                  aria-label="Connect with Freighter"
                >
                  <FreighterIcon />
                  <div className="wallet-option-info">
                    <span className="wallet-option-name">Freighter</span>
                    <span className="wallet-option-desc">Stellar official browser extension</span>
                  </div>
                </button>

                {/* xBull — coming soon */}
                <button
                  id="wallet-option-xbull"
                  className="wallet-option wallet-option--disabled"
                  disabled
                  aria-label="xBull — coming soon"
                >
                  <XBullIcon />
                  <div className="wallet-option-info">
                    <span className="wallet-option-name">xBull</span>
                    <span className="wallet-option-desc wallet-option-soon">Coming soon</span>
                  </div>
                </button>

                {/* Passkey — coming soon */}
                <button
                  id="wallet-option-passkey"
                  className="wallet-option wallet-option--disabled"
                  disabled
                  aria-label="Passkey — coming soon"
                >
                  <PasskeyIcon />
                  <div className="wallet-option-info">
                    <span className="wallet-option-name">Passkey</span>
                    <span className="wallet-option-desc wallet-option-soon">Coming soon</span>
                  </div>
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
