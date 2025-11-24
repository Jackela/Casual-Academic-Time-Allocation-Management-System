/**
 * SSOT Configuration for Presentation Mode
 * 
 * All timing and browser settings for presentation demos.
 * Single source of truth - change here to affect all presentation specs.
 */

export const PRESENTATION_CONFIG = {
  timing: {
    pauseBeforeClick: 400,
    pauseAfterClick: 300,
    pauseBeforeFill: 400,
    pauseAfterFill: 400,
    pauseBeforeSelect: 400,
    pauseAfterSelect: 400,
    pauseDropdownOpen: 200,
    overlayShort: 1500,
    overlayMedium: 2000,
    overlayLong: 2500,
    overlayFinal: 6000,
    dramaticPause: 2000,
    typingDelay: 50,
    postLoginPause: 400,
  },
  browser: {
    scaleFactor: 0.9,
    slowMo: 1000,
  },
};
