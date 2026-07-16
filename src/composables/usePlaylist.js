import { ref } from 'vue';
import { fetchPlaylist, filterRadios } from '../api/playlist';
import { IPTV_URL, IPTV_URL_BACKUP, RADIO_URL, RADIO_URL_BACKUP } from '../api/playlist';
import { getPlaylistUrl } from '../utils/geolocation';
import { getCustomIptv, buildM3UUrl } from '../utils/customIptv';

const CACHE_TTL = 3600000;
const cache = {};

function getCached(key) {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    delete cache[key];
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  cache[key] = { data, timestamp: Date.now() };
}

// ── Coupe du Monde 2026 : chaînes prioritaires ──
const WC_KEYWORDS = ['FIFA+ French'];

const PINNED_CHANNELS = [
  {
    name: 'Generations TV (576p)',
    url: 'https://event.vedge.infomaniak.com/livecast/ik:generation-tv/manifest.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'GenerationsTV.fr@SD', 'tvg-logo': 'https://i.imgur.com/NgBrDMe.png', 'group-title': 'Undefined' }
  },
  {
    name: 'MTV CLASSICS',
    url: 'https://jmp2.uk/plu-5f92b56a367e170007cd43f4.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'MTVCLASSICS.de@FR', 'tvg-logo': 'https://images.pluto.tv/channels/5f92b56a367e170007cd43f4/colorLogoPNG.png', 'group-title': 'Entertainment' }
  },
  {
    name: 'One Piece',
    url: 'https://jmp2.uk/plu-6380c94947c72b0007ee9a13.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'OnePiece.fr', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/misc/vod/one-piece-vod.png', 'group-title': 'Animation' }
  },
  {
    name: 'MacGyver',
    url: 'https://jmp2.uk/plu-6245ccd0c6cdb800074632e4.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'MacGyver.fr', 'tvg-logo': 'https://images.pluto.tv/channels/6245ccd0c6cdb800074632e4/colorLogoPNG.png', 'group-title': 'Séries' }
  },
  {
    name: 'AB1',
    url: 'http://145.239.5.177/332/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'AB1.fr', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/ab1-fr.png', 'group-title': 'Séries' }
  },
  {
    name: 'Action',
    url: 'http://rezofoot.tv/Action/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'Action.fr', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/action-fr.png', 'group-title': 'Séries' }
  },
  {
    name: 'TF1',
    url: 'http://151.80.18.177:86/TF1_HD/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TF1.fr@HD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/tf1-fr.png', 'group-title': 'Généraliste' }
  },
  {
    name: 'France 2',
    url: 'http://69.64.57.208/france2/mono.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'France2.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/france-2-fr.png', 'group-title': 'Généraliste' }
  },
  {
    name: 'France 4',
    url: 'https://sv1.data-stream.top/8c0a287e56a6e1843143904778be3775b4d3edd4fba4ffcc3f72638c7a71d4d4/hls/francetv4.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'France4.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/france-4-fr.png', 'group-title': 'Généraliste' }
  },
  {
    name: 'France 5',
    url: 'http://69.64.57.208/france5/mono.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'France5.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/france-5-fr.png', 'group-title': 'Généraliste' }
  },
  {
    name: 'Arte',
    url: 'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'arte.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/arte-fr.png', 'group-title': 'Généraliste' }
  },
  {
    name: 'BFM TV',
    url: 'https://live-cdn-stream-euw1.bfmtv.bct.nextradiotv.com/master.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'BFMTV.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/bfm-tv-fr.png', 'group-title': 'Info' }
  },
  {
    name: 'BFM2',
    url: 'https://d1ib1gsg71oarf.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-scp7wda722jph/BFM2_FR.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'BFM2.fr@HD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/bfm-tv-fr.png', 'group-title': 'Info' }
  },
  {
    name: 'CNews',
    url: 'https://raw.githubusercontent.com/Paradise-91/ParaTV/main/streams/canalplus/cnews-dm.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'CNews.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/c-news-fr.png', 'group-title': 'Info' }
  },
  {
    name: 'LCI',
    url: 'http://151.80.18.177:86/LCI_HD/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'LCI.fr@HD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/lci-fr.png', 'group-title': 'Info' }
  },
  {
    name: 'France 24 FR',
    url: 'https://live.france24.com/hls/live/2037179/F24_FR_HI_HLS/master_5000.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'France24.fr@French', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/france-24-fr.png', 'group-title': 'Info' }
  },
  {
    name: 'Euronews FR',
    url: 'https://cdn-euronews.akamaized.net/live/eds/euronews-fr/25026/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'EuronewsFrench.fr@SD', 'tvg-logo': 'https://en.wikipedia.org/wiki/Special:FilePath/Euronews_logo.svg?width=128', 'group-title': 'Info' }
  },
  {
    name: "L'Equipe",
    url: 'https://dshn8inoshngm.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-gac2i63dmu8b7/LEquipe_FR.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'LEquipe.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/lequipe-fr.png', 'group-title': 'Sport' }
  },
  {
    name: 'Foot+',
    url: 'http://145.239.5.177/556a/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'FootPlus.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/canal-plus-foot-fr.png', 'group-title': 'Sport' }
  },
  {
    name: 'W9',
    url: 'https://origin-m6web.live.6cloud.fr/out/v1/6play/6play-w9/cmaf_q2hyb21h/hls-short-hd.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'W9.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/w9-fr.png', 'group-title': 'Divertissement' }
  },
  {
    name: 'TMC',
    url: 'http://151.80.18.177:86/TMC/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TMC.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/tmc-fr.png', 'group-title': 'Divertissement' }
  },
  {
    name: 'TFX',
    url: 'http://145.239.5.177/315/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TFX.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/tfx-fr.png', 'group-title': 'Divertissement' }
  },
  {
    name: 'RMC Story',
    url: 'https://d15aro46bnpfm8.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-fqkqiax1078up/RMC_Story_FR.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'RMCStory.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/rmc-story-fr.png', 'group-title': 'Divertissement' }
  },
  {
    name: 'RMC Découverte',
    url: 'http://41.205.77.102/RMCDECOUVERTE/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'RMCDecouverte.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/rmc-decouverte-fr.png', 'group-title': 'Divertissement' }
  },
  {
    name: 'Paris Première',
    url: 'http://cdn.haititivi.com/PARIS-PREMIERE/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'ParisPremiere.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/paris-premiere-fr.png', 'group-title': 'Divertissement' }
  },
  {
    name: 'Série Club',
    url: 'http://145.239.5.177/355/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'SerieClub.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/serie-club-fr.png', 'group-title': 'Séries' }
  },
  {
    name: 'Teva',
    url: 'http://41.205.77.102/TEVA/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'Teva.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/teva-fr.png', 'group-title': 'Lifestyle' }
  },
  {
    name: 'Syfy',
    url: 'http://99.27.51.147:8080/SYFY/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'Syfy.fr@SD', 'tvg-logo': 'https://en.wikipedia.org/wiki/Special:FilePath/Syfy_france.svg?width=128', 'group-title': 'Séries' }
  },
  {
    name: 'Gulli',
    url: 'http://99.27.51.147:8080/Gulli/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'Gulli.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/gulli-fr.png', 'group-title': 'Kids' }
  },
  {
    name: 'Nickelodeon',
    url: 'http://151.80.18.177:86/Nickelodeon_FR/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'Nickelodeon.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/nickelodeon-fr.png', 'group-title': 'Kids' }
  },
  {
    name: 'Nickelodeon Junior',
    url: 'http://151.80.18.177:86/Nickelodeon_Junior/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'NickelodeonJunior.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/nickelodeon-junior-fr.png', 'group-title': 'Kids' }
  },
  {
    name: 'Disney Jr',
    url: 'http://41.205.77.102/DISNEY-JUNIOR/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'DisneyJr.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/disney-jr-fr.png', 'group-title': 'Kids' }
  },
  {
    name: 'TiJi',
    url: 'http://41.205.77.102/TIJI/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TiJi.fr@HD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/tiji-fr.png', 'group-title': 'Kids' }
  },
  {
    name: 'Canal J',
    url: 'http://41.205.77.102/CANALJ/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'CanalJ.fr@HD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/canal-j-fr.png', 'group-title': 'Kids' }
  },
  {
    name: 'Télétoon+',
    url: 'http://cdn.haititivi.com/TELETOON-HD/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TeletoonPlus.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/teletoon-plus-fr.png', 'group-title': 'Kids' }
  },
  {
    name: 'MCM Top',
    url: 'http://rezofoot.tv/MCM/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'MCMTop.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/mcm-top-fr.png', 'group-title': 'Musique' }
  },
  {
    name: 'M6 Music',
    url: 'http://145.239.5.177/320/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'M6Music.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/m6-music-fr.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace Urban',
    url: 'http://145.239.5.177/210/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceUrban.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/trace-urban-fr.png', 'group-title': 'Musique' }
  },
  {
    name: 'MTV FR',
    url: 'http://41.205.70.146/MTVFRANCE/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'MTV.fr@SD', 'tvg-logo': 'https://en.wikipedia.org/wiki/Special:FilePath/MTV-2021.svg?width=128', 'group-title': 'Musique' }
  },
  {
    name: 'CStar',
    url: 'https://raw.githubusercontent.com/Paradise-91/ParaTV/refs/heads/main/streams/canalplus/cstar-dm.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'CStar.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/c-star-fr.png', 'group-title': 'Musique' }
  },
  {
    name: 'Gong',
    url: 'https://amg01596-gongnetworks-gong-ono-vh5f2.amagi.tv/1080p-vtt/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'Gong.fr@SD', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/d/d7/GONG.png', 'group-title': 'Musique' }
  },
  {
    name: 'Cine+ Classic',
    url: 'http://99.27.51.147/CineClassic/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'CinePlusClassic.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/cine-plus-classic-fr.png', 'group-title': 'Cinéma' }
  },
  {
    name: 'Cine+ Frisson',
    url: 'http://99.27.51.147:8080/CineFrisson/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'CinePlusFrisson.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/cine-plus-frisson-fr.png', 'group-title': 'Cinéma' }
  },
  {
    name: 'Nat Geo Wild',
    url: 'http://41.205.77.102/NATGEO-WILD/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'NationalGeographicWild.fr@SD', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/2/27/National_Geographic_Wild_logo.svg', 'group-title': 'Documentaires' }
  },
  {
    name: 'Canal+ Cinéma',
    url: 'http://151.80.18.177:86/Canal+_cinema_HD/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'CanalPlusCinemas.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/canal-plus-cinemas-fr.png', 'group-title': 'Cinéma' }
  },
  {
    name: 'Canal+ Family',
    url: 'http://151.80.18.177:86/Canal+_Family_HD/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'CanalPlusFamily.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/hd/canal-plus-family-hd-fr.png', 'group-title': 'Divertissement' }
  },
  {
    name: 'Trace LATINA',
    url: 'https://channels.trace.plus/Traceprod/LATINA_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceLatina.fr', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/trace-latina-fr.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace CARIBBEAN',
    url: 'https://channels.trace.plus/Traceprod/CARIBBEAN_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceCaribbean.fr', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/trace-caribbean-fr.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace AFRICA FR',
    url: 'https://channels.trace.plus/Traceprod/AFRICA_FR_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceAfricaFr.fr', 'tvg-logo': 'https://www.acces.tv/wp-content/uploads/2024/11/logo-trace-africa.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace URBAN FR',
    url: 'https://channels.trace.plus/Traceprod/URBAN_FR_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceUrbanFr.fr', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/trace-urban-fr.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace VANILLA',
    url: 'https://channels.trace.plus/Traceprod/VANILLA_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceVanilla.fr', 'tvg-logo': 'https://www.planetecsat.com/wp-content/uploads/2023/04/Entete-TRACE-Vanilla.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace TERANGA',
    url: 'https://channels.trace.plus/Traceprod/TERANGA_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceTeranga.fr', 'tvg-logo': 'https://web.archive.org/web/2025/https://www.lyngsat.com/logo/tv/tt/trace-teranga-fr.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace SPORT STARS',
    url: 'https://channels.trace.plus/Traceprod/TRACE_SPORT_STARS_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceSportStars.fr', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/trace-sport-stars-fr.png', 'group-title': 'Sport' }
  },
  {
    name: 'Trace NAIJA',
    url: 'https://channels.trace.plus/Traceprod/NAIJA_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceNaija.fr', 'tvg-logo': 'https://web.archive.org/web/2025/https://www.lyngsat.com/logo/tv/tt/trace-naija-fr.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace MZIKI',
    url: 'https://channels.trace.plus/Traceprod/MZIKI_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceMziki.fr', 'tvg-logo': 'https://web.archive.org/web/2025/https://www.lyngsat.com/logo/tv/tt/trace-mziki-fr.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace BRAZUCA',
    url: 'https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01131-tracetv-tracebrazuca-samsungbr/playlist.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceBrazuca.br', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/brazil/trace-brasil-br.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace TOCA',
    url: 'https://channels.trace.plus/Traceprod/TOCA_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceToca.br', 'tvg-logo': 'https://web.archive.org/web/2025/https://www.lyngsat.com/logo/tv/tt/trace-toca-fr.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace GOSPEL',
    url: 'https://channels.trace.plus/Traceprod/GOSPEL_FR_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceGospel.fr', 'tvg-logo': 'https://www.acces.tv/wp-content/uploads/2024/11/logo-trace-gospel.png', 'group-title': 'Musique' }
  },
  {
    name: 'Trace NGOMA',
    url: 'https://channels.trace.plus/Traceprod/AFRICA_EN_hd/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TraceNgoma.za', 'tvg-logo': 'https://03mcdecdnimagerepository.blob.core.windows.net/epguideimage/channel/8GT.png', 'group-title': 'Musique' }
  },
  {
    name: 'M6',
    url: 'https://viamotionhsi.netplus.ch/live/eds/m6hd/browser-HLS8/m6hd.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'M6.fr@HD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/m6-fr.png', 'group-title': 'Généraliste' }
  },
  {
    name: '6ter',
    url: 'https://viamotionhsi.netplus.ch/live/eds/6ter/browser-HLS8/6ter.m3u8',
    isTv: true,
    meta: { 'tvg-id': '6ter.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/6ter-fr.png', 'group-title': 'Divertissement' }
  }
];

function promoteWorldCup(channels) {
  const pinnedNames = new Set(PINNED_CHANNELS.map(p => p.name.toLowerCase()));
  const pinned = [];
  const rest = [];
  for (const ch of channels) {
    if (pinnedNames.has((ch.name || '').toLowerCase())) continue;
    const idx = WC_KEYWORDS.findIndex(kw =>
      ch.name && ch.name.toLowerCase().includes(kw.toLowerCase())
    );
    if (idx >= 0 && !pinned[idx]) {
      pinned[idx] = ch;
    } else {
      rest.push(ch);
    }
  }
  return [...pinned.filter(Boolean), ...PINNED_CHANNELS, ...rest];
}
// ────────────────────────────────────────────────

export function usePlaylist() {
  const tvs = ref([]);
  const loading = ref(false);

  function getUrls(mode, country) {
    if (mode === 'custom') {
      const creds = getCustomIptv();
      if (creds) return [buildM3UUrl(creds.server, creds.username, creds.password)];
      return [];
    }
    if (mode === 'iptv') return [IPTV_URL, IPTV_URL_BACKUP];
    if (mode === 'radio') return [RADIO_URL, RADIO_URL_BACKUP];
    return [getPlaylistUrl(country, 'home')];
  }

  async function load(mode, country = '', preserveSelection = false) {
    const urls = getUrls(mode, country);
    if (!urls.length) {
      tvs.value = [];
      return tvs.value;
    }
    const primary = urls[0];

    const cached = getCached(primary);
    if (cached) {
      const result = mode === 'radio' ? filterRadios(cached) : cached;
      tvs.value = mode !== 'radio' ? promoteWorldCup(result) : result;
      return tvs.value;
    }

    loading.value = true;
    let lastError;

    for (const url of urls) {
      try {
        const parsed = await fetchPlaylist(url);
        const result = mode === 'radio' ? filterRadios(parsed) : parsed;
        setCached(primary, parsed);
        tvs.value = mode !== 'radio' ? promoteWorldCup(result) : result;
        if (mode === 'home') {
          try { localStorage.setItem('tvlistUrl', url); } catch (e) { console.warn('[Cache] Failed to save tvlistUrl', e); }
        }
        loading.value = false;
        return tvs.value;
      } catch (e) {
        lastError = e;
      }
    }

    tvs.value = [];
    loading.value = false;
    throw lastError || new Error('Failed to load playlist');
  }

  return { tvs, loading, load };
}
