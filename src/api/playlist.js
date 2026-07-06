import axios from 'axios';
import { parse, suffix } from '../utils/tvlistsupport';

export const IPTV_URL = 'https://iptv-org.github.io/iptv/index.m3u';
export const IPTV_URL_BACKUP = 'https://raw.githubusercontent.com/iptv-org/iptv/master/index.m3u';
export const RADIO_URL = 'https://iptv-org.github.io/iptv/categories/music.m3u';
export const RADIO_URL_BACKUP = 'https://raw.githubusercontent.com/iptv-org/iptv/master/categories/music.m3u';

export async function fetchPlaylist(url) {
  const resp = await axios.get(url);
  let suffixName = suffix(url);
  if (suffixName === 'm3u8') suffixName = 'm3u';
  return parse(resp.data, suffixName);
}

export function filterRadios(channels) {
  return channels.filter((ch) => {
    if (!ch.isTv) return true;
    const name = (ch.name || '').toLowerCase();
    const group = (ch.meta?.['group-title'] || '').toLowerCase();
    return name.includes('radio') || name.includes('fm') || group.includes('radio') || group.includes('audio');
  });
}
