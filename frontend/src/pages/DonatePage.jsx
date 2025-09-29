import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const donationLinks = {
  buymeacoffee: import.meta.env.VITE_DONATE_BMAC_URL || 'https://www.buymeacoffee.com/',
  patreon: import.meta.env.VITE_DONATE_PATREON_URL || 'https://www.patreon.com/',
}

const upiConfig = {
  id: import.meta.env.VITE_DONATE_UPI_ID || '',
  name: import.meta.env.VITE_DONATE_UPI_NAME || '',
  note: import.meta.env.VITE_DONATE_UPI_NOTE || '',
  amount: import.meta.env.VITE_DONATE_UPI_AMOUNT || '',
  uri: import.meta.env.VITE_DONATE_UPI_URI || '',
  qr: import.meta.env.VITE_DONATE_UPI_QR || '', // optional QR image URL
}

function buildUpiQuery() {
  // Ultra-compatible minimal query: required fields only; optional pn when available
  if (!upiConfig.id) return ''
  const params = new URLSearchParams()
  params.set('pa', String(upiConfig.id).trim())
  if (upiConfig.name) {
    const pn = String(upiConfig.name).replace(/\s+/g, ' ').trim().slice(0, 50)
    if (pn) params.set('pn', pn)
  }
  params.set('cu', 'INR')
  return params.toString()
}

function buildUpiUri() {
  const q = buildUpiQuery()
  if (!q) return ''
  return `upi://pay?${q}`
}

const isAndroid = () => /Android/i.test(navigator.userAgent)
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent)

const buildIntentUri = (pkg) => {
  const q = buildUpiQuery()
  if (!q) return ''
  if (!isAndroid()) return `upi://pay?${q}`
  return `intent://pay?${q}#Intent;scheme=upi;package=${pkg};end`
}

const buildIosUri = (app) => {
  const q = buildUpiQuery()
  if (!q) return ''
  switch (app) {
    case 'gpay':
      return `gpay://upi/pay?${q}`
    case 'phonepe':
      return `phonepe://upi/pay?${q}`
    case 'paytm':
      return `paytmmp://pay?${q}`
    case 'bhim':
      return `bhim://upi/pay?${q}`
    default:
      return `upi://pay?${q}`
  }
}

const providers = [
  { key: 'patreon', name: 'Patreon' },
  { key: 'buymeacoffee', name: 'Buy Me a Coffee' },
]

const DonatePage = () => {
  const [copyMessage, setCopyMessage] = useState('')
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [showUpiChooser, setShowUpiChooser] = useState(false)
  const [showPublicQr, setShowPublicQr] = useState(false)

  useEffect(() => {
    if (!showCopyModal) return
    const t = setTimeout(() => setShowCopyModal(false), 1600)
    return () => clearTimeout(t)
  }, [showCopyModal])

  const showCopied = (message = 'Copied') => {
    setCopyMessage(message)
    setShowCopyModal(true)
  }

  return (<>
    <div className="min-h-screen bg-[#0c0f13] text-white px-4">
      <div className="w-full pt-12 pb-28 mx-auto px-2 sm:px-8 md:px-12">
        <motion.div
          className="mb-6 md:mb-8"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
            Keep Streamr fast, private, and reliable. Your support makes a difference.
          </div>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          {/* Left: Info */}
          <motion.div 
            className="text-left order-2 md:order-1 hidden md:block"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="mb-6 w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg shadow-black/20">
              <svg className="w-7 h-7 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12.001 4.529c2.349-2.532 6.213-2.532 8.562 0 2.348 2.531 2.348 6.635 0 9.166l-7.07 7.622a2.1 2.1 0 01-3 0l-7.07-7.622c-2.348-2.531-2.348-6.635 0-9.166 2.349-2.532 6.213-2.532 8.562 0l1.016 1.095 1-1.095z" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">Support Streamr</h1>
            <p className="mt-4 text-white/70 leading-relaxed hidden md:block">
              If Streamr helps you unwind, consider supporting the costs to keep it fast, private, and reliable.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-6">
              <div className="text-white/80 space-y-4 bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                <p className="hidden md:block">
                  Streamr is crafted with care for speed, polish, and privacy—so browsing and watching feels effortless.
                </p>
                <p className="hidden md:block">
                  Your support covers hosting and helps ship improvements: faster loading, smarter discovery, and rock‑solid syncing.
                </p>
              </div>
              <div className="text-white/80 space-y-4 bg-white/[0.02] border border-white/10 rounded-2xl p-6 hidden md:block">
                <p>
                  Help keep Streamr independent and user‑first. If it made your movie nights better, thank you for backing it.
                </p>
              </div>
              <div className="text-white/60 text-sm hidden md:block">
                Prefer a different method? Reach out via the Community page and let us know.
              </div>
            </div>
          </motion.div>

          {/* Right: Actions */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.06 } }
            }}
            className="order-1 md:order-2 grid grid-cols-1 sm:grid-cols-2 gap-7 mt-6 md:mt-24"
          >
            {providers.map((p, idx) => (
              <motion.a
                key={p.key}
                href={donationLinks[p.key]}
                target="_blank"
                rel="noopener noreferrer"
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                className="group rounded-3xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] transition-all duration-200 shadow-lg shadow-black/10 p-5 flex flex-col items-start gap-4 hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    {p.key === 'patreon' && (
                      <svg className="w-5 h-5 text-white/90" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="14" cy="8" r="6" />
                        <rect x="2" y="4" width="4" height="16" rx="1.5" />
                      </svg>
                    )}
                    {p.key === 'buymeacoffee' && (
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 27 39"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-label="Buy Me a Coffee"
                      >
                        <path d="M14.3206 17.9122C12.9282 18.5083 11.3481 19.1842 9.30013 19.1842C8.44341 19.1824 7.59085 19.0649 6.76562 18.8347L8.18203 33.3768C8.23216 33.9847 8.50906 34.5514 8.95772 34.9645C9.40638 35.3776 9.994 35.6069 10.6039 35.6068C10.6039 35.6068 12.6122 35.7111 13.2823 35.7111C14.0036 35.7111 16.1662 35.6068 16.1662 35.6068C16.776 35.6068 17.3635 35.3774 17.8121 34.9643C18.2606 34.5512 18.5374 33.9846 18.5876 33.3768L20.1046 17.3073C19.4267 17.0757 18.7425 16.9219 17.9712 16.9219C16.6372 16.9214 15.5623 17.3808 14.3206 17.9122Z" fill="#FFF"></path>
                        <path d="M26.6584 10.3609L26.4451 9.28509C26.2537 8.31979 25.8193 7.40768 24.8285 7.05879C24.5109 6.94719 24.1505 6.89922 23.907 6.66819C23.6634 6.43716 23.5915 6.07837 23.5351 5.74565C23.4308 5.13497 23.3328 4.52377 23.2259 3.91413C23.1336 3.39002 23.0606 2.80125 22.8202 2.32042C22.5073 1.6748 21.858 1.29723 21.2124 1.04743C20.8815 0.923938 20.5439 0.819467 20.2012 0.734533C18.5882 0.308987 16.8922 0.152536 15.2328 0.0633591C13.241 -0.046547 11.244 -0.0134338 9.25692 0.162444C7.77794 0.296992 6.22021 0.459701 4.81476 0.971295C4.30108 1.15851 3.77175 1.38328 3.38115 1.78015C2.90189 2.26775 2.74544 3.02184 3.09537 3.62991C3.34412 4.06172 3.7655 4.3668 4.21242 4.56862C4.79457 4.82867 5.40253 5.02654 6.02621 5.15896C7.76282 5.54279 9.56148 5.6935 11.3356 5.75765C13.302 5.83701 15.2716 5.77269 17.2286 5.56521C17.7126 5.51202 18.1956 5.44822 18.6779 5.37382C19.2458 5.28673 19.6103 4.54411 19.4429 4.02678C19.2427 3.40828 18.7045 3.16839 18.0959 3.26173C18.0062 3.27581 17.917 3.28885 17.8273 3.30189L17.7626 3.31128C17.5565 3.33735 17.3503 3.36169 17.1441 3.38429C16.7182 3.43018 16.2913 3.46773 15.8633 3.49693C14.9048 3.56368 13.9437 3.59445 12.9831 3.59602C12.0391 3.59602 11.0947 3.56942 10.1529 3.50736C9.72314 3.4792 9.29447 3.44339 8.86684 3.39993C8.67232 3.37959 8.47832 3.35821 8.28432 3.33422L8.0997 3.31076L8.05955 3.30502L7.86816 3.27738C7.47703 3.21845 7.0859 3.15066 6.69895 3.06878C6.6599 3.06012 6.62498 3.03839 6.59994 3.0072C6.57491 2.976 6.56127 2.9372 6.56127 2.8972C6.56127 2.85721 6.57491 2.81841 6.59994 2.78721C6.62498 2.75602 6.6599 2.73429 6.69895 2.72563H6.70625C7.04158 2.65418 7.37951 2.59317 7.71849 2.53997C7.83148 2.52224 7.94482 2.50486 8.05851 2.48782H8.06164C8.27389 2.47374 8.48718 2.43567 8.69839 2.41064C10.536 2.2195 12.3845 2.15434 14.231 2.2156C15.1275 2.24168 16.0234 2.29435 16.9157 2.38509C17.1076 2.40491 17.2985 2.42577 17.4894 2.44923C17.5624 2.4581 17.6359 2.46853 17.7094 2.47739L17.8575 2.49878C18.2893 2.56309 18.7189 2.64115 19.1462 2.73293C19.7793 2.87061 20.5923 2.91546 20.8739 3.60906C20.9636 3.82913 21.0043 4.07371 21.0538 4.30474L21.1169 4.59939C21.1186 4.60467 21.1198 4.61008 21.1206 4.61555C21.2697 5.31089 21.4191 6.00623 21.5686 6.70157C21.5795 6.75293 21.5798 6.80601 21.5693 6.85748C21.5589 6.90895 21.5379 6.95771 21.5078 7.00072C21.4776 7.04373 21.4389 7.08007 21.3941 7.10747C21.3493 7.13487 21.2993 7.15274 21.2473 7.15997H21.2431L21.1519 7.17248L21.0617 7.18448C20.7759 7.22168 20.4897 7.25644 20.2033 7.28878C19.639 7.3531 19.0739 7.40872 18.5079 7.45566C17.3831 7.54918 16.2562 7.61055 15.127 7.63975C14.5516 7.65505 13.9763 7.66217 13.4013 7.66113C11.1124 7.65933 8.82553 7.5263 6.55188 7.2627C6.30574 7.2335 6.05959 7.20221 5.81344 7.1704C6.00431 7.19491 5.67472 7.15162 5.60797 7.14224C5.45152 7.12033 5.29506 7.09756 5.13861 7.07392C4.61346 6.99517 4.09144 6.89817 3.56733 6.81317C2.9337 6.70887 2.32771 6.76102 1.75458 7.07392C1.28413 7.33136 0.903361 7.72614 0.663078 8.20558C0.415886 8.71665 0.342354 9.2731 0.231796 9.82224C0.121237 10.3714 -0.0508594 10.9622 0.0143284 11.526C0.154613 12.7427 1.00518 13.7314 2.22863 13.9525C3.37959 14.1611 4.5368 14.3301 5.69714 14.474C10.2552 15.0323 14.8601 15.0991 19.4325 14.6733C19.8048 14.6385 20.1767 14.6006 20.548 14.5596C20.6639 14.5468 20.7813 14.5602 20.8914 14.5987C21.0016 14.6372 21.1017 14.6998 21.1845 14.782C21.2673 14.8642 21.3307 14.9639 21.37 15.0737C21.4093 15.1836 21.4235 15.3009 21.4116 15.4169L21.2958 16.5423C21.0625 18.8164 20.8292 21.0903 20.596 23.3641C20.3526 25.7519 20.1077 28.1395 19.8612 30.5269C19.7916 31.1993 19.7221 31.8715 19.6526 32.5436C19.5858 33.2054 19.5764 33.888 19.4507 34.542C19.2526 35.5704 18.5564 36.2019 17.5405 36.433C16.6098 36.6448 15.659 36.756 14.7045 36.7646C13.6464 36.7704 12.5888 36.7234 11.5307 36.7292C10.4011 36.7354 9.01755 36.6311 8.1456 35.7905C7.37951 35.052 7.27365 33.8958 7.16935 32.8961C7.03028 31.5725 6.89243 30.2491 6.75579 28.9259L5.98918 21.568L5.49324 16.8072C5.48489 16.7285 5.47655 16.6508 5.46873 16.5715C5.40927 16.0036 5.0072 15.4477 4.37357 15.4764C3.83121 15.5004 3.21479 15.9614 3.27841 16.5715L3.64607 20.1011L4.40642 27.4021C4.62302 29.4759 4.8391 31.5501 5.05465 33.6247C5.09637 34.022 5.13548 34.4205 5.17929 34.8179C5.41762 36.9894 7.07599 38.1596 9.12967 38.4892C10.3291 38.6822 11.5578 38.7218 12.775 38.7416C14.3353 38.7667 15.9113 38.8267 17.4461 38.544C19.7203 38.1268 21.4267 36.6082 21.6702 34.2526C21.7398 33.5725 21.8093 32.8923 21.8788 32.2119C22.11 29.9618 22.3409 27.7115 22.5714 25.4611L23.3255 18.1079L23.6713 14.7379C23.6885 14.5708 23.759 14.4137 23.8725 14.2898C23.986 14.1659 24.1363 14.0819 24.3012 14.0501C24.9515 13.9233 25.5732 13.7069 26.0357 13.212C26.7721 12.424 26.9187 11.3967 26.6584 10.3609ZM2.19525 11.0879C2.20516 11.0832 2.18691 11.1682 2.17909 11.2079C2.17752 11.1479 2.18065 11.0947 2.19525 11.0879ZM2.25836 11.5761C2.26357 11.5724 2.27921 11.5933 2.29538 11.6183C2.27087 11.5953 2.25523 11.5781 2.25783 11.5761H2.25836ZM2.32041 11.6579C2.34284 11.696 2.35483 11.72 2.32041 11.6579V11.6579ZM2.44505 11.7591H2.44818C2.44818 11.7627 2.45392 11.7664 2.456 11.7701C2.45255 11.766 2.4487 11.7624 2.44453 11.7591H2.44505ZM24.271 11.6079C24.0373 11.83 23.6853 11.9333 23.3375 11.9849C19.4366 12.5638 15.479 12.8569 11.5354 12.7275C8.71299 12.6311 5.92035 12.3176 3.12613 11.9229C2.85234 11.8843 2.55561 11.8342 2.36735 11.6324C2.01273 11.2517 2.18691 10.4851 2.27921 10.0251C2.3637 9.60373 2.52536 9.04207 3.02653 8.9821C3.80878 8.89031 4.71724 9.22042 5.49115 9.33776C6.4229 9.47996 7.35813 9.59382 8.29683 9.67935C12.303 10.0444 16.3765 9.98755 20.3649 9.45354C21.0919 9.35584 21.8163 9.24233 22.538 9.11299C23.181 8.99774 23.8939 8.78132 24.2825 9.44728C24.5489 9.90098 24.5844 10.508 24.5432 11.0207C24.5305 11.244 24.4329 11.4541 24.2705 11.6079H24.271Z" fill="#fff"></path>
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold tracking-tight">{p.name}</div>
                    <div className="text-xs text-white/60">One‑time or monthly</div>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-full border border-white/10 bg-white/5 group-hover:bg-white/10 transition-colors">
                  <span>Open</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 5l7 7-7 7" /></svg>
                </div>
              </motion.a>
            ))}

            {/* UPI */}
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              className={`rounded-3xl border border-white/10 bg-white/[0.02] p-5 shadow-lg shadow-black/10 flex flex-col items-start gap-4 hover:bg-white/[0.06] hover:-translate-y-0.5 transition-all ${buildUpiUri() ? '' : 'opacity-80'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M6 7h12M6 12h12M6 17h7" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold tracking-tight">UPI</div>
                  <div className="text-xs text-white/60">Pay with your preferred UPI app</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    if (!buildUpiUri()) return
                    setShowUpiChooser(true)
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm border border-white/10 bg-white/5 hover:bg-white/10 transition-colors ${buildUpiUri() ? '' : 'cursor-not-allowed'}`}
                >
                  <span>Open</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 5l7 7-7 7" /></svg>
                </button>
                <button
                  onClick={() => {
                    setShowPublicQr(true)
                    setTimeout(() => {
                      const el = document.getElementById('upi-qr')
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }, 0)
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3h7v7H3V3zm11 0h7v4h-7V3zM3 14h4v7H3v-7zm14 3h4v4h-4v-4zM10 10h4v4h-4v-4zm8-3h1v1h-1V7zM7 16h1v1H7v-1z"/></svg>
                  <span>QR</span>
                </button>
                {upiConfig.id && (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(upiConfig.id)
                        showCopied('UPI ID copied')
                      } catch (_) {
                        showCopied('Copy failed')
                      }
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="9" width="10" height="10" rx="2" /><rect x="5" y="5" width="10" height="10" rx="2" /></svg>
                    <span>Copy ID</span>
                  </button>
                )}
              </div>
            </motion.div>

            {/* UPI details and fallback */}
            {(upiConfig.id || upiConfig.qr) && (
              <motion.div 
                className="grid grid-cols-1 gap-5"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <div className="text-white/80 text-sm bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                  {upiConfig.id && (
                    <div className="mb-8 flex gap-4 justify-between">
                      <div className="text-white/60 mb-1 flex items-center gap-2 whitespace-nowrap">
                        <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M12 12a5 5 0 100-10 5 5 0 000 10z" />
                          <path d="M20 21a8 8 0 10-16 0" />
                        </svg>
                        UPI ID
                      </div>
                      <div className="flex items-center gap-2">
                        <code
                          className="px-2 py-1 bg-white/5 rounded-full border border-white/10 whitespace-pre-wrap break-all cursor-pointer hover:bg-white/10 transition"
                          title="Click to copy"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(upiConfig.id)
                              showCopied('UPI ID copied')
                            } catch (_) {
                              showCopied('Copy failed')
                            }
                          }}
                        >
                          {upiConfig.id}
                        </code>
                      </div>
                    </div>
                  )}
                  <div className="text-white/60">
                    Tip: On mobile, the UPI button opens your UPI app. On desktop, copy the UPI ID or scan the QR code.
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        
      </div>
      {showCopyModal && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -20, x: 20 }}
          className="fixed top-20 right-6 z-50 pointer-events-none"
        >
          <div className="pointer-events-auto px-4 py-2 rounded-xl bg-white/10 border border-white/10 backdrop-blur text-white shadow-lg shadow-black/30">
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 12l2 2 4-4" />
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{copyMessage}</span>
            </div>
          </div>
        </motion.div>
      )}
      {showUpiChooser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowUpiChooser(false)}
        >
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-sm rounded-2xl bg-[#14171c] border border-white/10 text-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Open with</h3>
              <button onClick={() => setShowUpiChooser(false)} className="text-white/60 hover:text-white">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={isIOS() ? buildIosUri('gpay') : buildIntentUri('com.google.android.apps.nbu.paisa.user')}
                rel="noreferrer"
                className="px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm flex items-center justify-center gap-2"
                onClick={(e) => {
                  const url = isIOS() ? buildIosUri('gpay') : buildIntentUri('com.google.android.apps.nbu.paisa.user')
                  if (!url) { e.preventDefault(); return }
                  e.preventDefault()
                  window.location.href = url
                  setTimeout(() => {
                    const generic = buildUpiUri()
                    if (generic) window.location.href = generic
                  }, 1200)
                }}
              >
                <img src="/Google Pay Icon.svg" alt="Google Pay" className="w-5 h-5 object-contain" />
                <span>GPay</span>
              </a>
              <a
                href={isIOS() ? buildIosUri('phonepe') : buildIntentUri('com.phonepe.app')}
                rel="noreferrer"
                className="px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm flex items-center justify-center gap-2"
                onClick={(e) => {
                  const url = isIOS() ? buildIosUri('phonepe') : buildIntentUri('com.phonepe.app')
                  if (!url) { e.preventDefault(); return }
                  e.preventDefault()
                  window.location.href = url
                  setTimeout(() => {
                    const generic = buildUpiUri()
                    if (generic) window.location.href = generic
                  }, 1200)
                }}
              >
                <img src="/PhonePe Icon.svg" alt="PhonePe" className="w-5 h-5 object-contain" />
                <span>PhonePe</span>
              </a>
              <a
                href={isIOS() ? buildIosUri('paytm') : buildIntentUri('net.one97.paytm')}
                rel="noreferrer"
                className="px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm flex items-center justify-center gap-2"
                onClick={(e) => {
                  const url = isIOS() ? buildIosUri('paytm') : buildIntentUri('net.one97.paytm')
                  if (!url) { e.preventDefault(); return }
                  e.preventDefault()
                  window.location.href = url
                  setTimeout(() => {
                    const generic = buildUpiUri()
                    if (generic) window.location.href = generic
                  }, 1200)
                }}
              >
                <img src="/Paytm Icon.svg" alt="Paytm" className="w-5 h-5 object-contain" />
                <span>Paytm</span>
              </a>
              <a
                href={isIOS() ? buildIosUri('bhim') : buildIntentUri('in.org.npci.upiapp')}
                rel="noreferrer"
                className="px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm flex items-center justify-center gap-2"
                onClick={(e) => {
                  const url = isIOS() ? buildIosUri('bhim') : buildIntentUri('in.org.npci.upiapp')
                  if (!url) { e.preventDefault(); return }
                  e.preventDefault()
                  window.location.href = url
                  setTimeout(() => {
                    const generic = buildUpiUri()
                    if (generic) window.location.href = generic
                  }, 1200)
                }}
              >
                <img src="/BHIM App Icon.svg" alt="BHIM" className="w-5 h-5 object-contain" />
                <span>BHIM</span>
              </a>
            </div>
            <div className="mt-3">
              <a href={buildUpiUri() || undefined} className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm border border-white/10 bg-white/5 hover:bg-white/10">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 7h12M6 12h12M6 17h7" /></svg>
                <span>Other UPI app</span>
              </a>
            </div>
            <p className="mt-3 text-xs text-white/50">Note: App selection works best on Android. On iOS, use your UPI app to scan the QR or copy ID.</p>
          </motion.div>
        </motion.div>
      )}
      {showPublicQr && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPublicQr(false)}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full max-w-xs sm:max-w-sm rounded-2xl bg-[#14171c] border border-white/10 text-white p-5 sm:p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 shadow-md shadow-black/20 flex flex-col items-center">
                <img
                  src="/qr-code.png"
                  alt="UPI QR Code"
                  className="w-48 h-48 sm:w-52 sm:h-52 rounded-md object-contain bg-white/5"
                  onError={() => setShowPublicQr(false)}
                />
                <div className="text-center text-white/60 text-xs mt-3">Scan with any UPI app</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
    <div className="w-full bg-[#181a1f]/95 border-t border-white/10 pt-6 pb-6 md:pb-8 flex flex-col items-center mt-16 md:mt-20">
      <div className="text-center text-white/60 text-sm">
        <p className='-mt-2 mb-1'>Thank you for supporting Streamr.</p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <a href="/community" className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">Community</a>
          <a href="/" className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">Home</a>
        </div>
      </div>
    </div>
  </>)
}

export default DonatePage


