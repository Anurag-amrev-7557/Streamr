import React from 'react';
import toast from 'react-hot-toast';

const SimpleAdBlockerToast = () => {
  const showAdBlockerToast = () => {
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-sm w-full bg-black/95 backdrop-blur-xl shadow-2xl rounded-xl pointer-events-auto flex ring-1 ring-white/10 border border-white/10`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                  <svg 
                    className="w-5 h-5 text-white" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-white">
                  Ad-Free Experience
                </p>
                <p className="mt-1 text-xs text-white/60">
                  Install uBlock Origin for completely ad-free streaming
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      window.open('https://chrome.google.com/webstore/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm', '_blank');
                      toast.dismiss(t.id);
                    }}
                    className="bg-white text-black hover:bg-gray-100 transition-colors px-3 py-1.5 rounded-lg text-xs font-medium"
                  >
                    Install
                  </button>
                  <button
                    onClick={() => {
                      window.open('https://chromewebstore.google.com/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh', '_blank');
                      toast.dismiss(t.id);
                    }}
                    className="bg-white/10 text-white hover:bg-white/20 transition-colors px-3 py-1.5 rounded-lg text-xs font-medium border border-white/20"
                  >
                    Lite
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex border-l border-white/10">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
        position: 'top-right',
      }
    );
  };

  return { showAdBlockerToast };
};

export default SimpleAdBlockerToast; 