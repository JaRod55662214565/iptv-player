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
  },
  // ── Nouvelles chaînes FR Info ──
  {
    name: 'BFM Business',
    url: 'https://live-cdn-stream-euw1.bfmb.bct.nextradiotv.com/master.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'BFMBusiness.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/bfm-business-fr.png', 'group-title': 'Info' }
  },
  {
    name: 'BFM Lyon',
    url: 'https://live-cdn-bfmtvlyo-euw1.bfmtv.bct.nextradiotv.com/master.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'BFMLyon.fr@SD', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/bfm-lyon-fr.png', 'group-title': 'Info' }
  },
  {
    name: 'KTO',
    url: 'https://live-kto.akamaized.net/hls/live/2033284/KTO/master.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'KTO.fr', 'tvg-logo': 'https://i.imgur.com/EY6TsdV.png', 'group-title': 'Info' }
  },
  {
    name: 'Le Media TV',
    url: 'https://raw.githubusercontent.com/Sibprod/streams/main/ressources/dm/py/hls/lemedia.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'LeMediaTV.fr', 'tvg-logo': 'https://i.imgur.com/OK20oyl.png', 'group-title': 'Info' }
  },
  {
    name: 'Africa 24',
    url: 'https://africa24.vedge.infomaniak.com/livecast/ik:africa24/manifest.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'Africa24.fr@SD', 'tvg-logo': 'https://i.imgur.com/5BZwRFs.png', 'group-title': 'Info' }
  },
  {
    name: 'Africa 24 English',
    url: 'https://edge20.vedge.infomaniak.com/livecast/ik:africa24english/manifest.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'Africa24English.fr@SD', 'tvg-logo': 'https://i.imgur.com/5BZwRFs.png', 'group-title': 'Info' }
  },
  {
    name: 'Africanews FR',
    url: 'https://cdn-euronews.akamaized.net/live/eds/africanews-fr/25050/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'AfricanewsFrench.fr@SD', 'tvg-logo': 'https://en.wikipedia.org/wiki/Special:FilePath/Africanews_logo.svg?width=128', 'group-title': 'Info' }
  },
  {
    name: 'France 24 English',
    url: 'https://live.france24.com/hls/live/2037176/F24_EN_HI_HLS/master_5000.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'France24.en@English', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/france-24-en.png', 'group-title': 'Info' }
  },
  {
    name: 'France 24 Arabic',
    url: 'https://live.france24.com/hls/live/2037181/F24_AR_HI_HLS/master_5000.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'France24.ar@Arabic', 'tvg-logo': 'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/france-24-ar.png', 'group-title': 'Info' }
  },
  {
    name: 'Euronews EN',
    url: 'https://cdn-euronews.akamaized.net/live/eds/euronews-en/25052/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'EuronewsEnglish.en@SD', 'tvg-logo': 'https://en.wikipedia.org/wiki/Special:FilePath/Euronews_logo.svg?width=128', 'group-title': 'Info' }
  },
  {
    name: 'Euronews DE',
    url: 'https://cdn-euronews.akamaized.net/live/eds/euronews-de/25024/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'EuronewsGerman.de@SD', 'tvg-logo': 'https://en.wikipedia.org/wiki/Special:FilePath/Euronews_logo.svg?width=128', 'group-title': 'Info' }
  },
  {
    name: 'Euronews ES',
    url: 'https://cdn-euronews.akamaized.net/live/eds/euronews-es/25025/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'EuronewsSpanish.es@SD', 'tvg-logo': 'https://en.wikipedia.org/wiki/Special:FilePath/Euronews_logo.svg?width=128', 'group-title': 'Info' }
  },
  {
    name: 'Euronews IT',
    url: 'https://cdn-euronews.akamaized.net/live/eds/euronews-it/25027/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'EuronewsItalian.it@SD', 'tvg-logo': 'https://en.wikipedia.org/wiki/Special:FilePath/Euronews_logo.svg?width=128', 'group-title': 'Info' }
  },
  {
    name: 'Euronews PT',
    url: 'https://cdn-euronews.akamaized.net/live/eds/euronews-pt/25028/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'EuronewsPortuguese.pt@SD', 'tvg-logo': 'https://en.wikipedia.org/wiki/Special:FilePath/Euronews_logo.svg?width=128', 'group-title': 'Info' }
  },
  {
    name: 'Euronews RU',
    url: 'https://cdn-euronews.akamaized.net/live/eds/euronews-ru/25029/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'EuronewsRussian.ru@SD', 'tvg-logo': 'https://en.wikipedia.org/wiki/Special:FilePath/Euronews_logo.svg?width=128', 'group-title': 'Info' }
  },
  // ── Nouvelles chaînes FR Régionales ──
  {
    name: 'Lyon Capitale TV',
    url: 'https://raw.githubusercontent.com/Sibprod/streams/main/ressources/dm/py/hls/lyoncapitale.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'LyonCapitaleTV.fr', 'tvg-logo': 'https://i.imgur.com/4WfnEaj.png', 'group-title': 'Régional' }
  },
  {
    name: 'B Smart TV',
    url: 'https://raw.githubusercontent.com/Sibprod/streams/main/ressources/dm/py/hls/bsmart.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'BSmartTV.fr@SD', 'tvg-logo': 'https://i.imgur.com/eC1gE4D.png', 'group-title': 'Régional' }
  },
  {
    name: 'Maison & Travaux TV',
    url: 'https://raw.githubusercontent.com/Sibprod/streams/main/ressources/dm/py/hls/maisonettravaux.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'MaisonTravauxTV.fr', 'tvg-logo': 'https://i.imgur.com/uYpc6nE.png', 'group-title': 'Lifestyle' }
  },
  {
    name: 'Men\'s UP TV',
    url: 'https://raw.githubusercontent.com/Sibprod/streams/main/ressources/dm/py/hls/mensuptv.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'MensUPTV.fr', 'tvg-logo': 'https://i.imgur.com/5BZwRFs.png', 'group-title': 'Lifestyle' }
  },
  {
    name: 'Into Crime',
    url: 'https://amg00711-zylo-amg00711c10-rakuten-fr-6731.playouts.now.amagi.tv/playlist.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'IntoCrime.fr', 'tvg-logo': 'https://i.imgur.com/43at4M2.png', 'group-title': 'Documentaires' }
  },
  {
    name: 'ici Elsass',
    url: 'https://raw.githubusercontent.com/Sibprod/streams/main/ressources/dm/py/hls/icielsass.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'iciElsass.fr', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/fr/6/69/Ici_Elsass.svg', 'group-title': 'Régional' }
  },
  {
    name: '20 Minutes TV',
    url: 'https://live-20minutestv.digiteka.com/1961167769/index.m3u8',
    isTv: true,
    meta: { 'tvg-id': '20MinutesTV.fr@SD', 'tvg-logo': 'https://i.imgur.com/fEjNAps.png', 'group-title': 'Info' }
  },
  {
    name: 'Brionnais TV',
    url: 'https://stream2.mandarine.media/brionnaistv/brionnaistv/playlist.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'BrionnaisTV.fr@SD', 'tvg-logo': 'https://i.imgur.com/DCZKAQ1.png', 'group-title': 'Régional' }
  },
  // ── Sports Internationaux ──
  {
    name: 'FIFA+ English',
    url: 'https://a62dad94.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWV1X0ZJRkFQbHVzRW5nbGlzaF9ITFM/playlist.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'FIFAPlus.en', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/FIFA%2B_(2025).svg/700px-FIFA%2B_(2025).svg.png', 'group-title': 'Sport' }
  },
  {
    name: 'FIFA+ Women',
    url: 'https://cffda8ff.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/U2Ftc3VuZy1nYl9GSUZBUGx1c3dvbWVuX0hMUw/playlist.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'FIFAPlusWomen.en', 'tvg-logo': 'https://i.imgur.com/xy9ZxVO.png', 'group-title': 'Sport' }
  },
  {
    name: 'FIFA+ Spanish',
    url: 'https://b2b6d5d7.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWV1X0ZJRkFQbHVzU3BhbmlzaF9ITFM/playlist.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'FIFAPlus.es', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/FIFA%2B_(2025).svg/700px-FIFA%2B_(2025).svg.png', 'group-title': 'Sport' }
  },
  {
    name: 'Red Bull TV',
    url: 'https://e7c8f7d5.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWdiX1JlZEJ1bGxUVi0xX0hMUw/playlist.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'RedBullTV.int', 'tvg-logo': 'https://github.com/tv-logo/tv-logos/blob/main/countries/international/red-bull-tv-int.png?raw=true', 'group-title': 'Sport' }
  },
  {
    name: 'Motorsport.tv',
    url: 'https://25dee28f.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWV1X01vdG9yc3BvcnR0di0xX0hMUw/playlist.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'MotorsportTV.int', 'tvg-logo': 'https://i.imgur.com/qmczb2N.png', 'group-title': 'Sport' }
  },
  {
    name: 'Teledeporte',
    url: 'https://d1cctoeg0n48w5.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-mnixw9wn5ugmv/TeledeporteES.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'Teledeporte.es', 'tvg-logo': 'https://i.imgur.com/b0H5f62.png', 'group-title': 'Sport' }
  },
  {
    name: 'Esport3',
    url: 'https://directes-tv-int.3catdirectes.cat/live-content/esport3-hls/master.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'Esport3.es', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Esport3.svg/330px-Esport3.svg.png', 'group-title': 'Sport' }
  },
  {
    name: 'ERT Sports 1',
    url: 'http://hbbtvapp.ert.gr/stream.php/v/vid_ertsports_mpeg.2ts',
    isTv: true,
    meta: { 'tvg-id': 'ERTSports1.gr', 'tvg-logo': 'https://i.imgur.com/EsczO2H.png', 'group-title': 'Sport' }
  },
  {
    name: 'ERT Sports 2',
    url: 'http://hbbtvapp.ert.gr/stream.php/v/vid_ertplay2_mpeg.2ts',
    isTv: true,
    meta: { 'tvg-id': 'ERTSports2.gr', 'tvg-logo': 'https://i.imgur.com/EsczO2H.png', 'group-title': 'Sport' }
  },
  {
    name: 'RTSH Sport',
    url: 'http://178.33.11.6:8696/live/rtshsport/playlist.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'RTSHSport.al', 'tvg-logo': 'https://i.postimg.cc/PrqBt2h1/tvrisport.png', 'group-title': 'Sport' }
  },
  {
    name: 'Belarus 5',
    url: 'https://ngtrk.dc.beltelecom.by/ngtrk/smil:belarus5.smil/playlist.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'Belarus5.by', 'tvg-logo': 'https://i.imgur.com/NJsRFud.png', 'group-title': 'Sport' }
  },
  {
    name: 'TVRI Sport',
    url: 'https://ott-balancer.tvri.go.id/live/eds/SportHD/hls/SportHD.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'TVRISport.id', 'tvg-logo': '', 'group-title': 'Sport' }
  },
  {
    name: 'San Marino RTV Sport',
    url: 'https://d2hrvno5bw6tg2.cloudfront.net/smrtv-ch02/smil:ch-02.smil/master.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'SanMarinoRTVSport.sm', 'tvg-logo': '', 'group-title': 'Sport' }
  },
  // ── Musique / Radio TV ──
  {
    name: 'Melody',
    url: 'https://raw.githubusercontent.com/Sibprod/streams/main/ressources/dm/py/hls/radiokaraoke.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'Melody.fr', 'tvg-logo': 'https://i.imgur.com/9GVyQ6x.png', 'group-title': 'Musique' }
  },
  {
    name: 'Fun Radio',
    url: 'https://raw.githubusercontent.com/Sibprod/streams/main/ressources/dm/py/hls/funradiofr.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'FunRadio.fr', 'tvg-logo': 'https://i.imgur.com/wgxuYsQ.png', 'group-title': 'Musique' }
  },
  {
    name: 'Littoral FM TV',
    url: 'https://live.creacast.com/littoralfm-ch1/stream/playlist.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'LittoralFMTV.fr', 'tvg-logo': 'https://i.imgur.com/DCZKAQ1.png', 'group-title': 'Musique' }
  },
  // ── International Entertainment ──
  {
    name: 'Pluto TV Movies',
    url: 'https://jmp2.uk/plu-5f526065e6d44e0007d15083.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'PlutoMovies.us', 'tvg-logo': 'https://images.pluto.tv/channels/5f526065e6d44e0007d15083/colorLogoPNG.png', 'group-title': 'Cinéma' }
  },
  {
    name: 'Pluto TV Comedy',
    url: 'https://jmp2.uk/plu-5f525ffde6d44e0007d14e68.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'PlutoComedy.us', 'tvg-logo': 'https://images.pluto.tv/channels/5f525ffde6d44e0007d14e68/colorLogoPNG.png', 'group-title': 'Divertissement' }
  },
  {
    name: 'Pluto TV Action',
    url: 'https://jmp2.uk/plu-5f526146e6d44e0007d153cf.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'PlutoAction.us', 'tvg-logo': 'https://images.pluto.tv/channels/5f526146e6d44e0007d153cf/colorLogoPNG.png', 'group-title': 'Cinéma' }
  },
  {
    name: 'Pluto TV Horror',
    url: 'https://jmp2.uk/plu-5f52615ae6d44e0007d15436.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'PlutoHorror.us', 'tvg-logo': 'https://images.pluto.tv/channels/5f52615ae6d44e0007d15436/colorLogoPNG.png', 'group-title': 'Cinéma' }
  },
  {
    name: 'Pluto TV Sci-Fi',
    url: 'https://jmp2.uk/plu-5f526164e6d44e0007d15468.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'PlutoSciFi.us', 'tvg-logo': 'https://images.pluto.tv/channels/5f526164e6d44e0007d15468/colorLogoPNG.png', 'group-title': 'Séries' }
  },
  {
    name: 'Pluto TV Drama',
    url: 'https://jmp2.uk/plu-5f5260d6e6d44e0007d151c5.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'PlutoDrama.us', 'tvg-logo': 'https://images.pluto.tv/channels/5f5260d6e6d44e0007d151c5/colorLogoPNG.png', 'group-title': 'Séries' }
  },
  {
    name: 'Pluto TV Crime',
    url: 'https://jmp2.uk/plu-5f526138e6d44e0007d1538d.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'PlutoCrime.us', 'tvg-logo': 'https://images.pluto.tv/channels/5f526138e6d44e0007d1538d/colorLogoPNG.png', 'group-title': 'Séries' }
  },
  {
    name: 'Pluto TV Comedy Central',
    url: 'https://jmp2.uk/plu-5fd3b8b6e74b4c0007a1e9a6.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'ComedyCentral.us', 'tvg-logo': 'https://images.pluto.tv/channels/5fd3b8b6e74b4c0007a1e9a6/colorLogoPNG.png', 'group-title': 'Divertissement' }
  },
  {
    name: 'Roku Channel',
    url: 'https://jmp2.uk/plu-5aec55a25e90620007293889.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'RokuChannel.us', 'tvg-logo': 'https://image.roku.com/brand-assets/roku-channel/logo/roku-channel-logo.svg', 'group-title': 'Divertissement' }
  },
  {
    name: 'Samsung TV Plus',
    url: 'https://jmp2.uk/plu-60b6dd0a1b6e4e0007f9b28b.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'SamsungTVPlus.us', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Samsung_TV_Plus_logo.svg', 'group-title': 'Divertissement' }
  },
  // ── VOD / Films ──
  {
    name: 'VOD Classic Movies',
    url: 'https://archive.org/download/classicmovies/classicmovies.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'ClassicMovies.us', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Internet_Archive_logo_and_wordmark.svg/700px-Internet_Archive_logo_and_wordmark.svg.png', 'group-title': 'VOD Films' }
  },
  {
    name: 'VOD Sci-Fi Movies',
    url: 'https://archive.org/download/sci-fi-movies/sci-fi-movies.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'SciFiMovies.us', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Internet_Archive_logo_and_wordmark.svg/700px-Internet_Archive_logo_and_wordmark.svg.png', 'group-title': 'VOD Films' }
  },
  {
    name: 'VOD Horror Movies',
    url: 'https://archive.org/download/horror-movies/horror-movies.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'HorrorMovies.us', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Internet_Archive_logo_and_wordmark.svg/700px-Internet_Archive_logo_and_wordmark.svg.png', 'group-title': 'VOD Films' }
  },
  {
    name: 'VOD Action Movies',
    url: 'https://archive.org/download/action-movies/action-movies.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'ActionMovies.us', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Internet_Archive_logo_and_wordmark.svg/700px-Internet_Archive_logo_and_wordmark.svg.png', 'group-title': 'VOD Films' }
  },
  {
    name: 'VOD Comedy Movies',
    url: 'https://archive.org/download/comedy-movies/comedy-movies.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'ComedyMovies.us', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Internet_Archive_logo_and_wordmark.svg/700px-Internet_Archive_logo_and_wordmark.svg.png', 'group-title': 'VOD Films' }
  },
  {
    name: 'VOD Drama Movies',
    url: 'https://archive.org/download/drama-movies/drama-movies.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'DramaMovies.us', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Internet_Archive_logo_and_wordmark.svg/700px-Internet_Archive_logo_and_wordmark.svg.png', 'group-title': 'VOD Films' }
  },
  {
    name: 'VOD Documentary',
    url: 'https://archive.org/download/documentary-movies/documentary-movies.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'Documentary.us', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Internet_Archive_logo_and_wordmark.svg/700px-Internet_Archive_logo_and_wordmark.svg.png', 'group-title': 'VOD Documentaires' }
  },
  {
    name: 'VOD Animation',
    url: 'https://archive.org/download/animation-movies/animation-movies.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'AnimationMovies.us', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Internet_Archive_logo_and_wordmark.svg/700px-Internet_Archive_logo_and_wordmark.svg.png', 'group-title': 'VOD Animation' }
  },
  // ── Radio HD / FLAC ──
  {
    name: 'Radio Paradise (FLAC)',
    url: 'http://stream.radioparadise.com/flacm',
    isTv: true,
    meta: { 'tvg-id': 'RadioParadise.int', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Radio_Paradise_logo.svg/700px-Radio_Paradise_logo.svg.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'Radio Paradise Mellow (FLAC)',
    url: 'http://stream.radioparadise.com/mellow-flacm',
    isTv: true,
    meta: { 'tvg-id': 'RPMellow.int', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Radio_Paradise_logo.svg/700px-Radio_Paradise_logo.svg.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'Radio Paradise Rock (FLAC)',
    url: 'http://stream.radioparadise.com/rock-flacm',
    isTv: true,
    meta: { 'tvg-id': 'RPRock.int', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Radio_Paradise_logo.svg/700px-Radio_Paradise_logo.svg.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'Radio Paradise Beyond (FLAC)',
    url: 'http://stream.radioparadise.com/beyond-flacm',
    isTv: true,
    meta: { 'tvg-id': 'RPBeyond.int', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Radio_Paradise_logo.svg/700px-Radio_Paradise_logo.svg.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'SomaFM Groove Salad (FLAC)',
    url: 'https://hls.somafm.com/hls/groovesalad/FLAC/program.m3u8',
    isTv: true,
    meta: { 'tvg-id': 'SomaFMGrooveSalad.int', 'tvg-logo': 'https://somafm.com/img3/groovesalad-400.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'SomaFM 70s (320k)',
    url: 'http://ice4.somafm.com/seventies-320-mp3',
    isTv: true,
    meta: { 'tvg-id': 'SomaFM70s.int', 'tvg-logo': 'https://somafm.com/img3/seventies-400.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'SomaFM 80s (256k)',
    url: 'http://ice6.somafm.com/u80s-256-mp3',
    isTv: true,
    meta: { 'tvg-id': 'SomaFM80s.int', 'tvg-logo': 'https://somafm.com/img3/u80s-400.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'SomaFM Lush (AAC)',
    url: 'http://ice5.somafm.com/lush-128-aac',
    isTv: true,
    meta: { 'tvg-id': 'SomaFMLush.int', 'tvg-logo': 'https://somafm.com/img3/lush-400.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'SomaFM Reggae (256k)',
    url: 'http://ice6.somafm.com/reggae-256-mp3',
    isTv: true,
    meta: { 'tvg-id': 'SomaFMReggae.int', 'tvg-logo': 'https://somafm.com/img3/reggae-400.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'SomaFM Folk (AAC)',
    url: 'http://ice2.somafm.com/folkfwd-128-aac',
    isTv: true,
    meta: { 'tvg-id': 'SomaFMFolk.int', 'tvg-logo': 'https://somafm.com/img3/folkfwd-400.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'NME Radio 1 (320k)',
    url: 'http://listen-nme.sharp-stream.com/nme1high.mp3',
    isTv: true,
    meta: { 'tvg-id': 'NME1.uk', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/NME_logo.svg/700px-NME_logo.svg.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'NME Radio 2 (320k)',
    url: 'http://listen-nme.sharp-stream.com/nme2high.mp3',
    isTv: true,
    meta: { 'tvg-id': 'NME2.uk', 'tvg-logo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/NME_logo.svg/700px-NME_logo.svg.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'JB Radio 2 (FLAC)',
    url: 'http://161.97.135.80:8001/flac',
    isTv: true,
    meta: { 'tvg-id': 'JBRadio2.int', 'tvg-logo': 'https://i.imgur.com/JBRadio2.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'Naim Radio (FLAC)',
    url: 'http://mscp3.live-streams.nl:8360/flac.flac',
    isTv: true,
    meta: { 'tvg-id': 'NaimRadio.uk', 'tvg-logo': 'https://i.imgur.com/NaimRadio.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'Radio Caroline',
    url: 'http://78.129.202.200:8030/;',
    isTv: true,
    meta: { 'tvg-id': 'RadioCaroline.uk', 'tvg-logo': 'https://i.imgur.com/RadioCaroline.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'Linn Radio (FLAC)',
    url: 'http://radio.linn.co.uk:8003/stream',
    isTv: true,
    meta: { 'tvg-id': 'LinnRadio.uk', 'tvg-logo': 'https://i.imgur.com/LinnRadio.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'New Clear Radio (320k)',
    url: 'http://live.ncradio.fm/320',
    isTv: true,
    meta: { 'tvg-id': 'NewClearRadio.int', 'tvg-logo': 'https://i.imgur.com/NewClearRadio.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'HILINE FLAC',
    url: 'http://mscp2.live-streams.nl:8100/flac.flac',
    isTv: true,
    meta: { 'tvg-id': 'HiLineFLAC.int', 'tvg-logo': 'https://i.imgur.com/HiLine.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'HILINE Pop',
    url: 'http://mediaserv30.live-streams.nl:8086/live',
    isTv: true,
    meta: { 'tvg-id': 'HiLinePop.int', 'tvg-logo': 'https://i.imgur.com/HiLine.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'HILINE Gold',
    url: 'http://mediaserv30.live-streams.nl:8000/live',
    isTv: true,
    meta: { 'tvg-id': 'HiLineGold.int', 'tvg-logo': 'https://i.imgur.com/HiLine.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'HILINE Classical',
    url: 'http://mediaserv30.live-streams.nl:8088/live',
    isTv: true,
    meta: { 'tvg-id': 'HiLineClassical.int', 'tvg-logo': 'https://i.imgur.com/HiLine.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'Radio Singsing (FLAC)',
    url: 'http://stream.sing-sing-bis.org:8000/singsingFlac',
    isTv: true,
    meta: { 'tvg-id': 'RadioSingsing.int', 'tvg-logo': 'https://i.imgur.com/Singsing.png', 'group-title': 'Radio HD' }
  },
  {
    name: 'Motherearth (FLAC)',
    url: 'https://motherearth.streamserver24.com/listen/motherearth/motherearth.flac-lo',
    isTv: true,
    meta: { 'tvg-id': 'Motherearth.int', 'tvg-logo': 'https://i.imgur.com/Motherearth.png', 'group-title': 'Radio HD' }
  },
  {
    name: '9128 Ambient',
    url: 'https://streams.radio.co/s0aa1e6f4a/listen',
    isTv: true,
    meta: { 'tvg-id': '9128Ambient.int', 'tvg-logo': 'https://i.imgur.com/9128.png', 'group-title': 'Radio HD' }
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
