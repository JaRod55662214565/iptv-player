// Geolocation utility for country-based content filtering
// Supports: France (FR), United Kingdom (GB), Germany (DE), Netherlands (NL), Portugal (PT), Tunisia (TN)

const SUPPORTED_COUNTRIES = {
  FR: { name: "France", code: "fr" },
  GB: { name: "United Kingdom", code: "gb" },
  DE: { name: "Germany", code: "de" },
  NL: { name: "Netherlands", code: "nl" },
  PT: { name: "Portugal", code: "pt" },
  TN: { name: "Tunisia", code: "tn" },
};

/**
 * Get flag image URL for a country code (reliable cross-platform rendering)
 * Uses flagcdn.com SVG flags for maximum compatibility
 * @param {string} countryCode - ISO country code
 * @returns {string} Flag image URL
 */
export function getFlagUrl(countryCode) {
  const info = SUPPORTED_COUNTRIES[countryCode];
  const iso = info ? info.code : countryCode.toLowerCase();
  return `https://flagcdn.com/${iso}.svg`;
}

const STORAGE_KEY = "selectedCountry";
const DEFAULT_COUNTRY = "FR";

/**
 * Get the currently selected country
 * @returns {string} Country code (FR, UK, DE, NL, PT)
 */
export function getSelectedCountry() {
  let stored = localStorage.getItem(STORAGE_KEY);
  // Migrate old "UK" key to "GB"
  if (stored === "UK") {
    stored = "GB";
    localStorage.setItem(STORAGE_KEY, stored);
  }
  if (stored && SUPPORTED_COUNTRIES[stored]) {
    return stored;
  }
  return DEFAULT_COUNTRY;
}

/**
 * Set the selected country
 * @param {string} countryCode - Country code (FR, UK, DE, NL, PT)
 */
export function setSelectedCountry(countryCode) {
  if (SUPPORTED_COUNTRIES[countryCode]) {
    localStorage.setItem(STORAGE_KEY, countryCode);
    return true;
  }
  return false;
}

/**
 * Get all supported countries
 * @returns {Object} Countries configuration
 */
export function getSupportedCountries() {
  return SUPPORTED_COUNTRIES;
}

/**
 * Get playlist URL for a country and type (2026 Updated)
 * @param {string} countryCode - Country code (FR, UK, DE, NL, PT)
 * @param {string} type - Playlist type (home, iptv, radio)
 * @returns {string} Playlist URL
 */
export function getPlaylistUrl(countryCode, type) {
  const countryInfo = SUPPORTED_COUNTRIES[countryCode] || SUPPORTED_COUNTRIES[DEFAULT_COUNTRY];
  const countryISOCode = countryInfo.code;

  const playlists = {
    home: `https://iptv-org.github.io/iptv/countries/${countryISOCode}.m3u`,
    iptv: "https://iptv-org.github.io/iptv/categories/entertainment.m3u",
    radio: "https://iptv-org.github.io/iptv/categories/music.m3u",
  };

  return playlists[type] || playlists.home;
}


