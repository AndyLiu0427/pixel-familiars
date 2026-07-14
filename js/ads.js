// Ad abstraction. With CONFIG.adClient set, uses Google AdSense H5 Games Ads
// (Ad Placement API: adConfig/adBreak). Without it, a simulated ad overlay
// runs so every reward flow works before AdSense approval.

import { CONFIG } from './config.js';
import { t } from './i18n.js';

let usingAdSense = false;

export function initAds() {
  if (!CONFIG.adClient || typeof document === 'undefined') return;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.dataset.adClient = CONFIG.adClient;
  s.dataset.adFrequencyHint = '30s';
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
  document.head.appendChild(s);
  window.adsbygoogle = window.adsbygoogle || [];
  window.adBreak = window.adBreak || function (o) { window.adsbygoogle.push(o); };
  window.adConfig = window.adConfig || function (o) { window.adsbygoogle.push(o); };
  window.adConfig({ preloadAdBreaks: 'on', sound: 'off' });
  usingAdSense = true;
}

// Returns a promise resolving true if the reward was earned.
export function showRewarded(name) {
  if (usingAdSense) {
    return new Promise(resolve => {
      let rewarded = false;
      window.adBreak({
        type: 'reward',
        name,
        beforeReward: showAdFn => showAdFn(),
        adViewed: () => { rewarded = true; },
        adDismissed: () => { rewarded = false; },
        afterAd: () => resolve(rewarded),
        // No fill: still resolve so the UI never hangs. Grant the reward,
        // punishing players for missing fill loses more than it protects.
        adBreakDone: info => {
          if (info && info.breakStatus !== 'viewed' && !rewarded) resolve(info.breakStatus === 'dismissed' ? false : true);
        },
      });
    });
  }
  return stubAd(name, true);
}

// Interstitial with a frequency guard. state.lastInterstitial is persisted.
export function maybeInterstitial(name, state, now = Date.now()) {
  if (now - (state.lastInterstitial ?? 0) < CONFIG.interstitialMinGapMs) return Promise.resolve(false);
  state.lastInterstitial = now;
  if (usingAdSense) {
    return new Promise(resolve => {
      window.adBreak({ type: 'next', name, afterAd: () => resolve(true), adBreakDone: () => resolve(true) });
    });
  }
  return stubAd(name, false).then(() => true);
}

// ---- Dev stub: 3s overlay with countdown ----

function stubAd(name, isReward) {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'ad-stub';
    wrap.innerHTML = `
      <div class="ad-stub-box">
        <div class="ad-stub-title">${t('ad_loading')}</div>
        <div class="ad-stub-note">${t('ad_stub_note')}</div>
        <div class="ad-stub-count"></div>
        <button class="btn ad-stub-close" hidden>${t('ad_close')}</button>
      </div>`;
    document.body.appendChild(wrap);
    const count = wrap.querySelector('.ad-stub-count');
    const close = wrap.querySelector('.ad-stub-close');
    let left = 3;
    count.textContent = t('ad_skip_in', { n: left });
    const iv = setInterval(() => {
      left--;
      if (left > 0) { count.textContent = t('ad_skip_in', { n: left }); return; }
      clearInterval(iv);
      count.textContent = '';
      close.hidden = false;
      close.focus();
    }, 1000);
    close.addEventListener('click', () => {
      wrap.classList.add('closing');
      setTimeout(() => { wrap.remove(); resolve(true); }, 160);
    });
  });
}
