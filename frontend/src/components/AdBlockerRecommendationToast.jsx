import React, { useState, useEffect } from 'react';

const AdBlockerRecommendationToast = ({ show, onClose, onDismiss }) => {
  const [visible, setVisible] = useState(show);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setIsAnimating(true);
      setVisible(true);
      try {
        localStorage.setItem('adBlockerToastShown', 'true');
      } catch (e) {}
      const timer = setTimeout(() => {
        handleClose();
      }, 7000);
      return () => clearTimeout(timer);
    } else {
      handleClose();
    }
  }, [show]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
      if (onDismiss) onDismiss();
    }, 300); // Wait for exit animation to complete
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 32,
        right: 28,
        zIndex: 1000,
        maxWidth: 320,
        width: '100%',
        background: '#181818',
        color: '#fff',
        borderRadius: 10,
        boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
        padding: 18,
        border: '1px solid #232323',
        fontFamily: 'inherit',
        fontSize: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transform: isAnimating ? 'translateX(0) scale(1)' : 'translateX(100%) scale(0.95)',
        opacity: isAnimating ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <svg
          width={22}
          height={22}
          fill="none"
          stroke="#fff"
          strokeWidth={2}
          style={{
            marginRight: 10,
            background: '#232323',
            borderRadius: 5,
            padding: 2,
            minWidth: 22,
            minHeight: 22,
            display: 'block',
          }}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>
          Ad-Free Streaming
        </span>
        <button
          onClick={() => {
            try {
              localStorage.setItem('adBlockerToastShown', 'true');
            } catch (e) {}
            handleClose();
          }}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
            padding: 0,
          }}
          aria-label="Dismiss"
          tabIndex={0}
        >
          ×
        </button>
      </div>
      <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.5 }}>
        For a cleaner experience, consider installing <span style={{ color: '#fff', fontWeight: 500 }}>uBlock Origin</span>.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <a
          href="https://chromewebstore.google.com/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            background: '#fff',
            color: '#181818',
            border: 'none',
            borderRadius: 100,
            padding: '7px 0',
            fontWeight: 600,
            fontSize: 13,
            textAlign: 'center',
            textDecoration: 'none',
            transition: 'background 0.15s, color 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <svg
            width={14}
            height={14}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          Lite
        </a>
        <a
          href="https://chrome.google.com/webstore/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            background: '#181818',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: 100,
            padding: '7px 0',
            fontWeight: 600,
            fontSize: 13,
            textAlign: 'center',
            textDecoration: 'none',
            transition: 'background 0.15s, color 0.15s, border-color 0.15s',
          }}
        >
          uBlock Origin
        </a>
      </div>
      <div style={{ textAlign: 'center', color: '#888', fontSize: 11.5 }}>
        <a
          href="https://github.com/gorhill/uBlock"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#bbb',
            textDecoration: 'underline',
            fontWeight: 400,
            transition: 'color 0.15s',
          }}
        >
          Learn more
        </a>
      </div>
    </div>
  );
};

export default AdBlockerRecommendationToast;