import { filterArticles, normalizeArticlesPayload, readAssetJson } from './static-data.js';
import {
  articleMatchesMonitoringConfig,
  findMatchingCountry,
  loadMonitoringConfig,
} from './monitoring-config.js';
import { appendReportLog } from './reports.js';

const ARTICLES_KV_KEY = 'articles:v1';
const ARTICLES_R2_KEY = 'articles/cache.json';
const ARTICLE_FETCH_STATUS_KEY = 'articles:fetch:status';
const MAX_FEED_BYTES = 2_000_000;
const DEFAULT_TRANSLATION_LIMIT = 80;

const GEO_PLACES = [
  { terms: ['沖縄', '那覇', 'naha', 'okinawa'], place: 'Okinawa / Naha', country: 'Japan', lat: 26.2124, lng: 127.6792 },
  { terms: ['奄美', 'amami'], place: 'Amami Islands', country: 'Japan', lat: 28.3772, lng: 129.4937 },
  { terms: ['九州', '福岡', 'kyushu', 'fukuoka'], place: 'Kyushu / Fukuoka', country: 'Japan', lat: 33.5902, lng: 130.4017 },
  { terms: ['関東', '東京', 'kanto', 'tokyo'], place: 'Tokyo / Kanto', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { terms: ['naha', 'okinawa'], place: 'Okinawa / Naha', country: 'Japan', lat: 26.2124, lng: 127.6792 },
  { terms: ['amami'], place: 'Amami Islands', country: 'Japan', lat: 28.3772, lng: 129.4937 },
  { terms: ['kyushu', 'fukuoka'], place: 'Kyushu / Fukuoka', country: 'Japan', lat: 33.5902, lng: 130.4017 },
  { terms: ['kanto', 'tokyo'], place: 'Tokyo / Kanto', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { terms: ['kinmen'], place: 'Kinmen', country: 'Taiwan', lat: 24.4368, lng: 118.3186 },
  { terms: ['matsu islands', 'matsu'], place: 'Matsu Islands', country: 'Taiwan', lat: 26.1605, lng: 119.9499 },
  { terms: ['kaohsiung'], place: 'Kaohsiung', country: 'Taiwan', lat: 22.6273, lng: 120.3014 },
  { terms: ['taipei'], place: 'Taipei', country: 'Taiwan', lat: 25.033, lng: 121.5654 },
  { terms: ['taiwan strait'], place: 'Taiwan Strait', country: 'Taiwan', lat: 24.2, lng: 119.8 },
  { terms: ['taiwan'], place: 'Taiwan', country: 'Taiwan', lat: 23.7, lng: 121.0 },
  { terms: ['beijing'], place: 'Beijing', country: 'China', lat: 39.9042, lng: 116.4074 },
  { terms: ['shanghai'], place: 'Shanghai', country: 'China', lat: 31.2304, lng: 121.4737 },
  { terms: ['hong kong'], place: 'Hong Kong', country: 'China', lat: 22.3193, lng: 114.1694 },
  { terms: ['guangdong'], place: 'Guangdong', country: 'China', lat: 23.379, lng: 113.7633 },
  { terms: ['pla ', 'people\'s liberation army', 'china', 'chinese'], place: 'China', country: 'China', lat: 35.86, lng: 104.19 },
  { terms: ['washington dc', 'washington, d.c.', 'pentagon'], place: 'Washington DC', country: 'United States', lat: 38.9072, lng: -77.0369 },
  { terms: ['norfolk'], place: 'Norfolk', country: 'United States', lat: 36.8508, lng: -76.2859 },
  { terms: ['san diego'], place: 'San Diego', country: 'United States', lat: 32.7157, lng: -117.1611 },
  { terms: ['united states', 'u.s.', ' usa ', 'america'], place: 'United States', country: 'United States', lat: 38.9, lng: -77.03 },
  { terms: ['moscow'], place: 'Moscow', country: 'Russia', lat: 55.7558, lng: 37.6173 },
  { terms: ['st petersburg', 'saint petersburg'], place: 'Saint Petersburg', country: 'Russia', lat: 59.9311, lng: 30.3609 },
  { terms: ['russia', 'russian'], place: 'Russia', country: 'Russia', lat: 55.76, lng: 37.62 },
  { terms: ['kyiv', 'kiev'], place: 'Kyiv', country: 'Ukraine', lat: 50.4501, lng: 30.5234 },
  { terms: ['odesa', 'odessa'], place: 'Odesa', country: 'Ukraine', lat: 46.4825, lng: 30.7233 },
  { terms: ['kharkiv'], place: 'Kharkiv', country: 'Ukraine', lat: 49.9935, lng: 36.2304 },
  { terms: ['ukraine'], place: 'Ukraine', country: 'Ukraine', lat: 49.0, lng: 31.0 },
  { terms: ['tehran'], place: 'Tehran', country: 'Iran', lat: 35.6892, lng: 51.389 },
  { terms: ['strait of hormuz', 'hormuz'], place: 'Strait of Hormuz', country: 'Iran', lat: 26.5667, lng: 56.25 },
  { terms: ['iran'], place: 'Iran', country: 'Iran', lat: 32.43, lng: 53.69 },
  { terms: ['jerusalem'], place: 'Jerusalem', country: 'Israel', lat: 31.7683, lng: 35.2137 },
  { terms: ['tel aviv'], place: 'Tel Aviv', country: 'Israel', lat: 32.0853, lng: 34.7818 },
  { terms: ['gaza'], place: 'Gaza', country: 'Palestinian Territories', lat: 31.5017, lng: 34.4668 },
  { terms: ['israel'], place: 'Israel', country: 'Israel', lat: 31.5, lng: 34.75 },
  { terms: ['pyongyang'], place: 'Pyongyang', country: 'North Korea', lat: 39.0392, lng: 125.7625 },
  { terms: ['north korea', 'dprk'], place: 'North Korea', country: 'North Korea', lat: 40.34, lng: 127.51 },
  { terms: ['seoul'], place: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.978 },
  { terms: ['south korea'], place: 'South Korea', country: 'South Korea', lat: 36.5, lng: 127.8 },
  { terms: ['japan'], place: 'Japan', country: 'Japan', lat: 36.2, lng: 138.25 },
  { terms: ['manila'], place: 'Manila', country: 'Philippines', lat: 14.5995, lng: 120.9842 },
  { terms: ['luzon'], place: 'Luzon', country: 'Philippines', lat: 16.0, lng: 121.0 },
  { terms: ['philippines'], place: 'Philippines', country: 'Philippines', lat: 12.88, lng: 121.77 },
  { terms: ['new delhi'], place: 'New Delhi', country: 'India', lat: 28.6139, lng: 77.209 },
  { terms: ['india'], place: 'India', country: 'India', lat: 20.59, lng: 78.96 },
  { terms: ['islamabad'], place: 'Islamabad', country: 'Pakistan', lat: 33.6844, lng: 73.0479 },
  { terms: ['pakistan'], place: 'Pakistan', country: 'Pakistan', lat: 30.38, lng: 69.35 },
  { terms: ['brussels'], place: 'NATO / Brussels', country: 'Belgium', lat: 50.85, lng: 4.35 },
  { terms: ['nato'], place: 'NATO / Brussels', country: 'Belgium', lat: 50.85, lng: 4.35 },
  { terms: ['bab el-mandeb', 'bab al-mandab'], place: 'Bab el-Mandeb', country: 'Yemen', lat: 12.5833, lng: 43.3333 },
  { terms: ['suez canal', 'suez'], place: 'Suez Canal', country: 'Egypt', lat: 30.5852, lng: 32.2654 },
  { terms: ['red sea'], place: 'Red Sea', country: 'Red Sea', lat: 20.0, lng: 38.0 },
  { terms: ['yemen', 'houthi'], place: 'Yemen', country: 'Yemen', lat: 15.55, lng: 48.5 },
  { terms: ['black sea'], place: 'Black Sea', country: 'Black Sea', lat: 44.4, lng: 34.0 },
  { terms: ['crimea'], place: 'Crimea', country: 'Ukraine', lat: 45.3, lng: 34.4 },
  { terms: ['south china sea', 'spratly', 'scarborough'], place: 'South China Sea', country: 'China', lat: 12.0, lng: 114.0 },
  { terms: ['arctic', 'greenland'], place: 'Arctic', country: 'Arctic', lat: 75.0, lng: -42.0 },
  { terms: ['europe', 'eu ', 'european'], place: 'Europe', country: 'Europe', lat: 50.1, lng: 14.4 },
  { terms: ['middle east', 'persian gulf'], place: 'Middle East', country: 'Middle East', lat: 29.3, lng: 47.5 },
];

const WORLD_GEO_PLACES = [
  // Americas
  { terms: ['new york state'], place: 'New York State', country: 'United States', lat: 42.9538, lng: -75.5268, confidence: 0.82 },
  { terms: ['new york city', 'nyc', 'manhattan', 'new york'], place: 'New York City', country: 'United States', lat: 40.7128, lng: -74.006, confidence: 0.9 },
  { terms: ['california'], place: 'California', country: 'United States', lat: 36.7783, lng: -119.4179, confidence: 0.82 },
  { terms: ['los angeles'], place: 'Los Angeles', country: 'United States', lat: 34.0522, lng: -118.2437, confidence: 0.9 },
  { terms: ['san francisco'], place: 'San Francisco', country: 'United States', lat: 37.7749, lng: -122.4194, confidence: 0.9 },
  { terms: ['san diego'], place: 'San Diego', country: 'United States', lat: 32.7157, lng: -117.1611, confidence: 0.9 },
  { terms: ['sacramento'], place: 'Sacramento', country: 'United States', lat: 38.5816, lng: -121.4944, confidence: 0.88 },
  { terms: ['texas'], place: 'Texas', country: 'United States', lat: 31.9686, lng: -99.9018, confidence: 0.82 },
  { terms: ['houston'], place: 'Houston', country: 'United States', lat: 29.7604, lng: -95.3698, confidence: 0.9 },
  { terms: ['dallas'], place: 'Dallas', country: 'United States', lat: 32.7767, lng: -96.797, confidence: 0.9 },
  { terms: ['austin'], place: 'Austin', country: 'United States', lat: 30.2672, lng: -97.7431, confidence: 0.9 },
  { terms: ['san antonio'], place: 'San Antonio', country: 'United States', lat: 29.4241, lng: -98.4936, confidence: 0.9 },
  { terms: ['florida'], place: 'Florida', country: 'United States', lat: 27.6648, lng: -81.5158, confidence: 0.82 },
  { terms: ['miami'], place: 'Miami', country: 'United States', lat: 25.7617, lng: -80.1918, confidence: 0.9 },
  { terms: ['tampa'], place: 'Tampa', country: 'United States', lat: 27.9506, lng: -82.4572, confidence: 0.88 },
  { terms: ['orlando'], place: 'Orlando', country: 'United States', lat: 28.5383, lng: -81.3792, confidence: 0.88 },
  { terms: ['jacksonville'], place: 'Jacksonville', country: 'United States', lat: 30.3322, lng: -81.6557, confidence: 0.88 },
  { terms: ['illinois'], place: 'Illinois', country: 'United States', lat: 40.6331, lng: -89.3985, confidence: 0.82 },
  { terms: ['chicago'], place: 'Chicago', country: 'United States', lat: 41.8781, lng: -87.6298, confidence: 0.9 },
  { terms: ['atlanta'], place: 'Atlanta', country: 'United States', lat: 33.749, lng: -84.388, confidence: 0.9 },
  { terms: ['georgia state', 'state of georgia'], place: 'Georgia State', country: 'United States', lat: 32.1656, lng: -82.9001, confidence: 0.82 },
  { terms: ['arizona'], place: 'Arizona', country: 'United States', lat: 34.0489, lng: -111.0937, confidence: 0.82 },
  { terms: ['phoenix'], place: 'Phoenix', country: 'United States', lat: 33.4484, lng: -112.074, confidence: 0.9 },
  { terms: ['nevada'], place: 'Nevada', country: 'United States', lat: 38.8026, lng: -116.4194, confidence: 0.82 },
  { terms: ['las vegas'], place: 'Las Vegas', country: 'United States', lat: 36.1699, lng: -115.1398, confidence: 0.9 },
  { terms: ['colorado'], place: 'Colorado', country: 'United States', lat: 39.5501, lng: -105.7821, confidence: 0.82 },
  { terms: ['denver'], place: 'Denver', country: 'United States', lat: 39.7392, lng: -104.9903, confidence: 0.9 },
  { terms: ['washington state'], place: 'Washington State', country: 'United States', lat: 47.7511, lng: -120.7401, confidence: 0.84 },
  { terms: ['seattle'], place: 'Seattle', country: 'United States', lat: 47.6062, lng: -122.3321, confidence: 0.9 },
  { terms: ['olympia'], place: 'Olympia', country: 'United States', lat: 47.0379, lng: -122.9007, confidence: 0.86 },
  { terms: ['oregon'], place: 'Oregon', country: 'United States', lat: 43.8041, lng: -120.5542, confidence: 0.82 },
  { terms: ['portland'], place: 'Portland', country: 'United States', lat: 45.5152, lng: -122.6784, confidence: 0.86 },
  { terms: ['pennsylvania'], place: 'Pennsylvania', country: 'United States', lat: 41.2033, lng: -77.1945, confidence: 0.82 },
  { terms: ['philadelphia'], place: 'Philadelphia', country: 'United States', lat: 39.9526, lng: -75.1652, confidence: 0.9 },
  { terms: ['pittsburgh'], place: 'Pittsburgh', country: 'United States', lat: 40.4406, lng: -79.9959, confidence: 0.88 },
  { terms: ['ohio'], place: 'Ohio', country: 'United States', lat: 40.4173, lng: -82.9071, confidence: 0.82 },
  { terms: ['columbus ohio'], place: 'Columbus, Ohio', country: 'United States', lat: 39.9612, lng: -82.9988, confidence: 0.9 },
  { terms: ['cleveland'], place: 'Cleveland', country: 'United States', lat: 41.4993, lng: -81.6944, confidence: 0.88 },
  { terms: ['michigan'], place: 'Michigan', country: 'United States', lat: 44.3148, lng: -85.6024, confidence: 0.82 },
  { terms: ['detroit'], place: 'Detroit', country: 'United States', lat: 42.3314, lng: -83.0458, confidence: 0.9 },
  { terms: ['north carolina'], place: 'North Carolina', country: 'United States', lat: 35.7596, lng: -79.0193, confidence: 0.82 },
  { terms: ['charlotte'], place: 'Charlotte', country: 'United States', lat: 35.2271, lng: -80.8431, confidence: 0.88 },
  { terms: ['raleigh'], place: 'Raleigh', country: 'United States', lat: 35.7796, lng: -78.6382, confidence: 0.88 },
  { terms: ['virginia'], place: 'Virginia', country: 'United States', lat: 37.4316, lng: -78.6569, confidence: 0.82 },
  { terms: ['norfolk'], place: 'Norfolk', country: 'United States', lat: 36.8508, lng: -76.2859, confidence: 0.9 },
  { terms: ['richmond'], place: 'Richmond', country: 'United States', lat: 37.5407, lng: -77.436, confidence: 0.86 },
  { terms: ['maryland'], place: 'Maryland', country: 'United States', lat: 39.0458, lng: -76.6413, confidence: 0.82 },
  { terms: ['baltimore'], place: 'Baltimore', country: 'United States', lat: 39.2904, lng: -76.6122, confidence: 0.88 },
  { terms: ['massachusetts'], place: 'Massachusetts', country: 'United States', lat: 42.4072, lng: -71.3824, confidence: 0.82 },
  { terms: ['boston'], place: 'Boston', country: 'United States', lat: 42.3601, lng: -71.0589, confidence: 0.9 },
  { terms: ['mexico city', 'cdmx'], place: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332, confidence: 0.9 },
  { terms: ['monterrey'], place: 'Monterrey', country: 'Mexico', lat: 25.6866, lng: -100.3161, confidence: 0.88 },
  { terms: ['guadalajara'], place: 'Guadalajara', country: 'Mexico', lat: 20.6597, lng: -103.3496, confidence: 0.88 },
  { terms: ['tijuana'], place: 'Tijuana', country: 'Mexico', lat: 32.5149, lng: -117.0382, confidence: 0.88 },
  { terms: ['ciudad juarez', 'juarez'], place: 'Ciudad Juarez', country: 'Mexico', lat: 31.6904, lng: -106.4245, confidence: 0.86 },
  { terms: ['mexico', 'mexican'], place: 'Mexico', country: 'Mexico', lat: 23.6345, lng: -102.5528, confidence: 0.72 },
  { terms: ['dominican republic', 'dominican'], place: 'Dominican Republic', country: 'Dominican Republic', lat: 18.7357, lng: -70.1627, confidence: 0.76 },
  { terms: ['santo domingo'], place: 'Santo Domingo', country: 'Dominican Republic', lat: 18.4861, lng: -69.9312, confidence: 0.9 },
  { terms: ['haiti', 'port au prince', 'port-au-prince'], place: 'Haiti', country: 'Haiti', lat: 18.5944, lng: -72.3074, confidence: 0.76 },
  { terms: ['jamaica', 'kingston'], place: 'Jamaica', country: 'Jamaica', lat: 18.1096, lng: -77.2975, confidence: 0.76 },
  { terms: ['cuba', 'havana'], place: 'Cuba', country: 'Cuba', lat: 21.5218, lng: -77.7812, confidence: 0.76 },
  { terms: ['panama city'], place: 'Panama City', country: 'Panama', lat: 8.9824, lng: -79.5199, confidence: 0.9 },
  { terms: ['panama'], place: 'Panama', country: 'Panama', lat: 8.538, lng: -80.7821, confidence: 0.72 },
  { terms: ['guatemala'], place: 'Guatemala', country: 'Guatemala', lat: 15.7835, lng: -90.2308, confidence: 0.72 },
  { terms: ['honduras'], place: 'Honduras', country: 'Honduras', lat: 15.2, lng: -86.2419, confidence: 0.72 },
  { terms: ['el salvador'], place: 'El Salvador', country: 'El Salvador', lat: 13.7942, lng: -88.8965, confidence: 0.76 },
  { terms: ['nicaragua'], place: 'Nicaragua', country: 'Nicaragua', lat: 12.8654, lng: -85.2072, confidence: 0.72 },
  { terms: ['costa rica'], place: 'Costa Rica', country: 'Costa Rica', lat: 9.7489, lng: -83.7534, confidence: 0.76 },
  { terms: ['toronto'], place: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832, confidence: 0.9 },
  { terms: ['vancouver'], place: 'Vancouver', country: 'Canada', lat: 49.2827, lng: -123.1207, confidence: 0.9 },
  { terms: ['montreal'], place: 'Montreal', country: 'Canada', lat: 45.5017, lng: -73.5673, confidence: 0.9 },
  { terms: ['ottawa'], place: 'Ottawa', country: 'Canada', lat: 45.4215, lng: -75.6972, confidence: 0.9 },
  { terms: ['alberta'], place: 'Alberta', country: 'Canada', lat: 53.9333, lng: -116.5765, confidence: 0.82 },
  { terms: ['calgary'], place: 'Calgary', country: 'Canada', lat: 51.0447, lng: -114.0719, confidence: 0.88 },
  { terms: ['quebec'], place: 'Quebec', country: 'Canada', lat: 46.8139, lng: -71.208, confidence: 0.82 },
  { terms: ['british columbia'], place: 'British Columbia', country: 'Canada', lat: 53.7267, lng: -127.6476, confidence: 0.82 },
  { terms: ['canada'], place: 'Canada', country: 'Canada', lat: 56.1304, lng: -106.3468, confidence: 0.72 },
  { terms: ['sao paulo'], place: 'Sao Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333, confidence: 0.9 },
  { terms: ['rio de janeiro'], place: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lng: -43.1729, confidence: 0.9 },
  { terms: ['brasilia'], place: 'Brasilia', country: 'Brazil', lat: -15.7939, lng: -47.8828, confidence: 0.9 },
  { terms: ['brazil'], place: 'Brazil', country: 'Brazil', lat: -14.235, lng: -51.9253, confidence: 0.72 },
  { terms: ['argentina', 'buenos aires'], place: 'Argentina', country: 'Argentina', lat: -38.4161, lng: -63.6167, confidence: 0.72 },
  { terms: ['chile', 'santiago'], place: 'Chile', country: 'Chile', lat: -35.6751, lng: -71.543, confidence: 0.72 },
  { terms: ['colombia', 'bogota'], place: 'Colombia', country: 'Colombia', lat: 4.5709, lng: -74.2973, confidence: 0.72 },
  { terms: ['venezuela', 'caracas'], place: 'Venezuela', country: 'Venezuela', lat: 6.4238, lng: -66.5897, confidence: 0.72 },
  { terms: ['peru', 'lima'], place: 'Peru', country: 'Peru', lat: -9.19, lng: -75.0152, confidence: 0.72 },
  { terms: ['ecuador', 'quito'], place: 'Ecuador', country: 'Ecuador', lat: -1.8312, lng: -78.1834, confidence: 0.72 },
  { terms: ['bolivia', 'la paz'], place: 'Bolivia', country: 'Bolivia', lat: -16.2902, lng: -63.5887, confidence: 0.72 },
  { terms: ['paraguay', 'asuncion'], place: 'Paraguay', country: 'Paraguay', lat: -23.4425, lng: -58.4438, confidence: 0.72 },
  { terms: ['uruguay', 'montevideo'], place: 'Uruguay', country: 'Uruguay', lat: -32.5228, lng: -55.7658, confidence: 0.72 },

  // Europe
  { terms: ['united kingdom', 'uk ', 'britain', 'british', 'london'], place: 'United Kingdom', country: 'United Kingdom', lat: 55.3781, lng: -3.436, confidence: 0.72 },
  { terms: ['france', 'french', 'paris'], place: 'France', country: 'France', lat: 46.2276, lng: 2.2137, confidence: 0.72 },
  { terms: ['germany', 'german', 'berlin'], place: 'Germany', country: 'Germany', lat: 51.1657, lng: 10.4515, confidence: 0.72 },
  { terms: ['italy', 'italian', 'rome'], place: 'Italy', country: 'Italy', lat: 41.8719, lng: 12.5674, confidence: 0.72 },
  { terms: ['spain', 'spanish', 'madrid'], place: 'Spain', country: 'Spain', lat: 40.4637, lng: -3.7492, confidence: 0.72 },
  { terms: ['netherlands', 'dutch', 'amsterdam'], place: 'Netherlands', country: 'Netherlands', lat: 52.1326, lng: 5.2913, confidence: 0.72 },
  { terms: ['poland', 'polish', 'warsaw'], place: 'Poland', country: 'Poland', lat: 51.9194, lng: 19.1451, confidence: 0.72 },
  { terms: ['romania', 'bucharest'], place: 'Romania', country: 'Romania', lat: 45.9432, lng: 24.9668, confidence: 0.72 },
  { terms: ['moldova', 'transnistria'], place: 'Moldova', country: 'Moldova', lat: 47.4116, lng: 28.3699, confidence: 0.72 },
  { terms: ['serbia', 'belgrade'], place: 'Serbia', country: 'Serbia', lat: 44.0165, lng: 21.0059, confidence: 0.72 },
  { terms: ['greece', 'athens'], place: 'Greece', country: 'Greece', lat: 39.0742, lng: 21.8243, confidence: 0.72 },
  { terms: ['turkey', 'türkiye', 'ankara', 'istanbul'], place: 'Turkey', country: 'Turkey', lat: 38.9637, lng: 35.2433, confidence: 0.72 },
  { terms: ['sweden', 'stockholm'], place: 'Sweden', country: 'Sweden', lat: 60.1282, lng: 18.6435, confidence: 0.72 },
  { terms: ['finland', 'helsinki'], place: 'Finland', country: 'Finland', lat: 61.9241, lng: 25.7482, confidence: 0.72 },
  { terms: ['norway', 'oslo'], place: 'Norway', country: 'Norway', lat: 60.472, lng: 8.4689, confidence: 0.72 },
  { terms: ['denmark', 'copenhagen'], place: 'Denmark', country: 'Denmark', lat: 56.2639, lng: 9.5018, confidence: 0.72 },

  // Middle East / Africa
  { terms: ['saudi arabia', 'saudi', 'riyadh'], place: 'Saudi Arabia', country: 'Saudi Arabia', lat: 23.8859, lng: 45.0792, confidence: 0.72 },
  { terms: ['united arab emirates', 'uae', 'abu dhabi', 'dubai'], place: 'United Arab Emirates', country: 'United Arab Emirates', lat: 23.4241, lng: 53.8478, confidence: 0.72 },
  { terms: ['qatar', 'doha'], place: 'Qatar', country: 'Qatar', lat: 25.3548, lng: 51.1839, confidence: 0.72 },
  { terms: ['kuwait'], place: 'Kuwait', country: 'Kuwait', lat: 29.3117, lng: 47.4818, confidence: 0.72 },
  { terms: ['bahrain'], place: 'Bahrain', country: 'Bahrain', lat: 26.0667, lng: 50.5577, confidence: 0.72 },
  { terms: ['oman', 'muscat'], place: 'Oman', country: 'Oman', lat: 21.4735, lng: 55.9754, confidence: 0.72 },
  { terms: ['iraq', 'baghdad'], place: 'Iraq', country: 'Iraq', lat: 33.2232, lng: 43.6793, confidence: 0.72 },
  { terms: ['syria', 'damascus'], place: 'Syria', country: 'Syria', lat: 34.8021, lng: 38.9968, confidence: 0.72 },
  { terms: ['jordan', 'amman'], place: 'Jordan', country: 'Jordan', lat: 30.5852, lng: 36.2384, confidence: 0.72 },
  { terms: ['lebanon', 'beirut'], place: 'Lebanon', country: 'Lebanon', lat: 33.8547, lng: 35.8623, confidence: 0.72 },
  { terms: ['afghanistan', 'kabul'], place: 'Afghanistan', country: 'Afghanistan', lat: 33.9391, lng: 67.71, confidence: 0.72 },
  { terms: ['egypt', 'cairo'], place: 'Egypt', country: 'Egypt', lat: 26.8206, lng: 30.8025, confidence: 0.72 },
  { terms: ['sudan', 'khartoum'], place: 'Sudan', country: 'Sudan', lat: 12.8628, lng: 30.2176, confidence: 0.72 },
  { terms: ['ethiopia', 'addis ababa'], place: 'Ethiopia', country: 'Ethiopia', lat: 9.145, lng: 40.4897, confidence: 0.72 },
  { terms: ['somalia', 'mogadishu'], place: 'Somalia', country: 'Somalia', lat: 5.1521, lng: 46.1996, confidence: 0.72 },
  { terms: ['kenya', 'nairobi'], place: 'Kenya', country: 'Kenya', lat: -0.0236, lng: 37.9062, confidence: 0.72 },
  { terms: ['nigeria', 'abuja'], place: 'Nigeria', country: 'Nigeria', lat: 9.082, lng: 8.6753, confidence: 0.72 },
  { terms: ['south africa', 'pretoria', 'johannesburg'], place: 'South Africa', country: 'South Africa', lat: -30.5595, lng: 22.9375, confidence: 0.72 },
  { terms: ['libya', 'tripoli'], place: 'Libya', country: 'Libya', lat: 26.3351, lng: 17.2283, confidence: 0.72 },
  { terms: ['mali', 'bamako'], place: 'Mali', country: 'Mali', lat: 17.5707, lng: -3.9962, confidence: 0.72 },
  { terms: ['niger', 'niamey'], place: 'Niger', country: 'Niger', lat: 17.6078, lng: 8.0817, confidence: 0.72 },
  { terms: ['burkina faso'], place: 'Burkina Faso', country: 'Burkina Faso', lat: 12.2383, lng: -1.5616, confidence: 0.76 },
  { terms: ['democratic republic of congo', 'drc', 'kinshasa'], place: 'Democratic Republic of Congo', country: 'Democratic Republic of Congo', lat: -4.0383, lng: 21.7587, confidence: 0.76 },
  { terms: ['morocco', 'rabat'], place: 'Morocco', country: 'Morocco', lat: 31.7917, lng: -7.0926, confidence: 0.72 },
  { terms: ['algeria', 'algiers'], place: 'Algeria', country: 'Algeria', lat: 28.0339, lng: 1.6596, confidence: 0.72 },

  // Asia-Pacific
  { terms: ['sydney'], place: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, confidence: 0.9 },
  { terms: ['melbourne'], place: 'Melbourne', country: 'Australia', lat: -37.8136, lng: 144.9631, confidence: 0.9 },
  { terms: ['canberra'], place: 'Canberra', country: 'Australia', lat: -35.2809, lng: 149.13, confidence: 0.9 },
  { terms: ['australia'], place: 'Australia', country: 'Australia', lat: -25.2744, lng: 133.7751, confidence: 0.72 },
  { terms: ['new zealand', 'wellington'], place: 'New Zealand', country: 'New Zealand', lat: -40.9006, lng: 174.886, confidence: 0.76 },
  { terms: ['indonesia', 'jakarta'], place: 'Indonesia', country: 'Indonesia', lat: -0.7893, lng: 113.9213, confidence: 0.72 },
  { terms: ['malaysia', 'kuala lumpur'], place: 'Malaysia', country: 'Malaysia', lat: 4.2105, lng: 101.9758, confidence: 0.72 },
  { terms: ['thailand', 'bangkok'], place: 'Thailand', country: 'Thailand', lat: 15.87, lng: 100.9925, confidence: 0.72 },
  { terms: ['vietnam', 'hanoi'], place: 'Vietnam', country: 'Vietnam', lat: 14.0583, lng: 108.2772, confidence: 0.72 },
  { terms: ['myanmar', 'burma', 'yangon'], place: 'Myanmar', country: 'Myanmar', lat: 21.9162, lng: 95.956, confidence: 0.72 },
  { terms: ['singapore'], place: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, confidence: 0.72 },
  { terms: ['mumbai'], place: 'Mumbai', country: 'India', lat: 19.076, lng: 72.8777, confidence: 0.9 },
  { terms: ['delhi', 'new delhi'], place: 'New Delhi', country: 'India', lat: 28.6139, lng: 77.209, confidence: 0.9 },
  { terms: ['bengaluru', 'bangalore'], place: 'Bengaluru', country: 'India', lat: 12.9716, lng: 77.5946, confidence: 0.9 },
  { terms: ['chennai'], place: 'Chennai', country: 'India', lat: 13.0827, lng: 80.2707, confidence: 0.88 },
  { terms: ['hyderabad'], place: 'Hyderabad', country: 'India', lat: 17.385, lng: 78.4867, confidence: 0.88 },
  { terms: ['kolkata'], place: 'Kolkata', country: 'India', lat: 22.5726, lng: 88.3639, confidence: 0.88 },
  { terms: ['kashmir'], place: 'Kashmir', country: 'India', lat: 34.0837, lng: 74.7973, confidence: 0.86 },
  { terms: ['xinjiang'], place: 'Xinjiang', country: 'China', lat: 43.793, lng: 87.6271, confidence: 0.86 },
  { terms: ['tibet'], place: 'Tibet', country: 'China', lat: 29.65, lng: 91.1175, confidence: 0.86 },
  { terms: ['guangzhou'], place: 'Guangzhou', country: 'China', lat: 23.1291, lng: 113.2644, confidence: 0.9 },
  { terms: ['shenzhen'], place: 'Shenzhen', country: 'China', lat: 22.5431, lng: 114.0579, confidence: 0.9 },
  { terms: ['wuhan'], place: 'Wuhan', country: 'China', lat: 30.5928, lng: 114.3055, confidence: 0.88 },
  { terms: ['chengdu'], place: 'Chengdu', country: 'China', lat: 30.5728, lng: 104.0668, confidence: 0.88 },
  { terms: ['vladivostok'], place: 'Vladivostok', country: 'Russia', lat: 43.1155, lng: 131.8855, confidence: 0.9 },
  { terms: ['belgorod'], place: 'Belgorod', country: 'Russia', lat: 50.5954, lng: 36.5873, confidence: 0.88 },
  { terms: ['kursk'], place: 'Kursk', country: 'Russia', lat: 51.7304, lng: 36.1926, confidence: 0.88 },
  { terms: ['kaliningrad'], place: 'Kaliningrad', country: 'Russia', lat: 54.7104, lng: 20.4522, confidence: 0.88 },
  { terms: ['siberia'], place: 'Siberia', country: 'Russia', lat: 60.0, lng: 90.0, confidence: 0.82 },
  { terms: ['bangladesh', 'dhaka'], place: 'Bangladesh', country: 'Bangladesh', lat: 23.685, lng: 90.3563, confidence: 0.72 },
  { terms: ['sri lanka', 'colombo'], place: 'Sri Lanka', country: 'Sri Lanka', lat: 7.8731, lng: 80.7718, confidence: 0.76 },
  { terms: ['nepal', 'kathmandu'], place: 'Nepal', country: 'Nepal', lat: 28.3949, lng: 84.124, confidence: 0.72 },
  { terms: ['kazakhstan', 'astana'], place: 'Kazakhstan', country: 'Kazakhstan', lat: 48.0196, lng: 66.9237, confidence: 0.72 },
  { terms: ['uzbekistan', 'tashkent'], place: 'Uzbekistan', country: 'Uzbekistan', lat: 41.3775, lng: 64.5853, confidence: 0.72 },
  { terms: ['azerbaijan', 'baku'], place: 'Azerbaijan', country: 'Azerbaijan', lat: 40.1431, lng: 47.5769, confidence: 0.72 },
  { terms: ['armenia', 'yerevan'], place: 'Armenia', country: 'Armenia', lat: 40.0691, lng: 45.0382, confidence: 0.72 },
  { terms: ['georgia', 'tbilisi'], place: 'Georgia', country: 'Georgia', lat: 42.3154, lng: 43.3569, confidence: 0.72 },
];

const EXPANDED_LOCAL_GEO_PLACES = [
  // Russia / Eurasia
  { terms: ['rostov-on-don', 'rostov on don', 'rostov'], place: 'Rostov-on-Don', country: 'Russia', lat: 47.2357, lng: 39.7015, confidence: 0.9 },
  { terms: ['krasnodar'], place: 'Krasnodar', country: 'Russia', lat: 45.0355, lng: 38.9753, confidence: 0.88 },
  { terms: ['kazan', 'tatarstan'], place: 'Kazan / Tatarstan', country: 'Russia', lat: 55.7961, lng: 49.1064, confidence: 0.88 },
  { terms: ['yekaterinburg', 'ekaterinburg'], place: 'Yekaterinburg', country: 'Russia', lat: 56.8389, lng: 60.6057, confidence: 0.88 },
  { terms: ['nizhny novgorod'], place: 'Nizhny Novgorod', country: 'Russia', lat: 56.2965, lng: 43.9361, confidence: 0.88 },
  { terms: ['samara'], place: 'Samara', country: 'Russia', lat: 53.1959, lng: 50.1002, confidence: 0.86 },

  // China / Asia-Pacific
  { terms: ['fujian'], place: 'Fujian', country: 'China', lat: 26.0789, lng: 117.9874, confidence: 0.88 },
  { terms: ['xiamen'], place: 'Xiamen', country: 'China', lat: 24.4798, lng: 118.0894, confidence: 0.9 },
  { terms: ['fuzhou'], place: 'Fuzhou', country: 'China', lat: 26.0745, lng: 119.2965, confidence: 0.88 },
  { terms: ['hainan'], place: 'Hainan', country: 'China', lat: 19.1959, lng: 109.7453, confidence: 0.86 },
  { terms: ['dalian'], place: 'Dalian', country: 'China', lat: 38.914, lng: 121.6147, confidence: 0.88 },
  { terms: ['qingdao'], place: 'Qingdao', country: 'China', lat: 36.0671, lng: 120.3826, confidence: 0.88 },
  { terms: ['tianjin'], place: 'Tianjin', country: 'China', lat: 39.3434, lng: 117.3616, confidence: 0.88 },
  { terms: ['chongqing'], place: 'Chongqing', country: 'China', lat: 29.563, lng: 106.5516, confidence: 0.88 },
  { terms: ['nanjing'], place: 'Nanjing', country: 'China', lat: 32.0603, lng: 118.7969, confidence: 0.88 },

  // Australia / Oceania
  { terms: ['victoria'], place: 'Victoria', country: 'Australia', lat: -36.9848, lng: 143.3906, confidence: 0.86 },
  { terms: ['queensland'], place: 'Queensland', country: 'Australia', lat: -20.9176, lng: 142.7028, confidence: 0.86 },
  { terms: ['western australia'], place: 'Western Australia', country: 'Australia', lat: -25.2303, lng: 121.0187, confidence: 0.86 },
  { terms: ['northern territory'], place: 'Northern Territory', country: 'Australia', lat: -19.4914, lng: 132.5509, confidence: 0.86 },
  { terms: ['brisbane'], place: 'Brisbane', country: 'Australia', lat: -27.4698, lng: 153.0251, confidence: 0.9 },
  { terms: ['perth'], place: 'Perth', country: 'Australia', lat: -31.9523, lng: 115.8613, confidence: 0.9 },
  { terms: ['adelaide'], place: 'Adelaide', country: 'Australia', lat: -34.9285, lng: 138.6007, confidence: 0.88 },
  { terms: ['darwin'], place: 'Darwin', country: 'Australia', lat: -12.4634, lng: 130.8456, confidence: 0.88 },
  { terms: ['townsville'], place: 'Townsville', country: 'Australia', lat: -19.259, lng: 146.8169, confidence: 0.88 },

  // Africa
  { terms: ['nairobi'], place: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219, confidence: 0.9 },
  { terms: ['mombasa'], place: 'Mombasa', country: 'Kenya', lat: -4.0435, lng: 39.6682, confidence: 0.88 },
  { terms: ['lagos'], place: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792, confidence: 0.9 },
  { terms: ['johannesburg'], place: 'Johannesburg', country: 'South Africa', lat: -26.2041, lng: 28.0473, confidence: 0.9 },
  { terms: ['cape town'], place: 'Cape Town', country: 'South Africa', lat: -33.9249, lng: 18.4241, confidence: 0.9 },
  { terms: ['darfur'], place: 'Darfur', country: 'Sudan', lat: 13.62, lng: 25.35, confidence: 0.88 },
  { terms: ['port sudan'], place: 'Port Sudan', country: 'Sudan', lat: 19.6158, lng: 37.2164, confidence: 0.9 },
  { terms: ['el fasher', 'al fashir'], place: 'El Fasher', country: 'Sudan', lat: 13.6279, lng: 25.3494, confidence: 0.9 },
  { terms: ['wad madani'], place: 'Wad Madani', country: 'Sudan', lat: 14.4012, lng: 33.5199, confidence: 0.88 },
  { terms: ['tigray'], place: 'Tigray', country: 'Ethiopia', lat: 14.0323, lng: 38.3166, confidence: 0.88 },
  { terms: ['oromia'], place: 'Oromia', country: 'Ethiopia', lat: 7.546, lng: 40.6347, confidence: 0.86 },
  { terms: ['goma'], place: 'Goma', country: 'Democratic Republic of Congo', lat: -1.6585, lng: 29.2205, confidence: 0.9 },
  { terms: ['north kivu', 'm23'], place: 'North Kivu', country: 'Democratic Republic of Congo', lat: -0.7918, lng: 29.0459, confidence: 0.88 },

  // South America
  { terms: ['buenos aires'], place: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816, confidence: 0.9 },
  { terms: ['santiago'], place: 'Santiago', country: 'Chile', lat: -33.4489, lng: -70.6693, confidence: 0.9 },
  { terms: ['bogota', 'bogotá'], place: 'Bogota', country: 'Colombia', lat: 4.711, lng: -74.0721, confidence: 0.9 },
  { terms: ['caracas'], place: 'Caracas', country: 'Venezuela', lat: 10.4806, lng: -66.9036, confidence: 0.9 },
  { terms: ['lima'], place: 'Lima', country: 'Peru', lat: -12.0464, lng: -77.0428, confidence: 0.9 },
  { terms: ['quito'], place: 'Quito', country: 'Ecuador', lat: -0.1807, lng: -78.4678, confidence: 0.9 },
  { terms: ['la paz'], place: 'La Paz', country: 'Bolivia', lat: -16.4897, lng: -68.1193, confidence: 0.88 },
  { terms: ['asuncion', 'asunción'], place: 'Asuncion', country: 'Paraguay', lat: -25.2637, lng: -57.5759, confidence: 0.88 },
  { terms: ['montevideo'], place: 'Montevideo', country: 'Uruguay', lat: -34.9011, lng: -56.1645, confidence: 0.9 },
  { terms: ['amazonas', 'amazon basin', 'amazon rainforest'], place: 'Amazon Basin', country: 'Regional', lat: -3.4653, lng: -62.2159, confidence: 0.86 },
  { terms: ['guyana'], place: 'Guyana', country: 'Guyana', lat: 4.8604, lng: -58.9302, confidence: 0.76 },
  { terms: ['essequibo'], place: 'Essequibo', country: 'Guyana', lat: 6.8, lng: -58.8, confidence: 0.88 },
];

const GEO_SEARCH_PLACES = [...EXPANDED_LOCAL_GEO_PLACES, ...GEO_PLACES, ...WORLD_GEO_PLACES];

export async function loadArticleSet(context) {
  const staticPayload = await readAssetJson(context, '/data/articles.json', { articles: [] });
  const staticArticles = normalizeArticlesPayload(staticPayload);
  const monitoringConfig = await loadMonitoringConfig(context);
  const storedPayload = await readStoredArticlePayload(context);

  if (!storedPayload) {
    const articles = normalizeExistingArticles(staticArticles, monitoringConfig);
    return {
      articles,
      lastFetch: staticPayload.lastFetch || null,
      source: 'static-asset',
    };
  }

  try {
    const payload = storedPayload.payload;
    const kvArticles = normalizeArticlesPayload(payload);
    const articles = kvArticles.length
      ? filterCachedArticles(kvArticles, monitoringConfig)
      : normalizeExistingArticles(staticArticles, monitoringConfig);
    return {
      articles,
      lastFetch: payload.lastFetch || staticPayload.lastFetch || null,
      source: kvArticles.length ? storedPayload.source : 'static-asset',
    };
  } catch (_) {
    const articles = normalizeExistingArticles(staticArticles, monitoringConfig);
    return {
      articles,
      lastFetch: staticPayload.lastFetch || null,
      source: 'static-asset',
    };
  }
}

async function readStoredArticlePayload(context) {
  const env = context.env || {};

  if (env.REPORTS_BUCKET) {
    try {
      const object = await env.REPORTS_BUCKET.get(ARTICLES_R2_KEY);
      if (object) {
        return {
          payload: JSON.parse(await object.text()),
          source: 'r2',
        };
      }
    } catch (err) {
      console.warn(`R2 article cache read skipped: ${err.message}`);
    }
  }

  if (env.CONFIG_KV) {
    try {
      const raw = await env.CONFIG_KV.get(ARTICLES_KV_KEY);
      if (raw) {
        return {
          payload: JSON.parse(raw),
          source: 'config-kv',
        };
      }
    } catch (err) {
      console.warn(`KV article cache read skipped: ${err.message}`);
    }
  }

  return null;
}

async function writeArticlePayload(env, payload) {
  const body = JSON.stringify(payload);
  if (env.REPORTS_BUCKET) {
    await env.REPORTS_BUCKET.put(ARTICLES_R2_KEY, body, {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
    });
    return 'r2';
  }
  if (env.CONFIG_KV) {
    await env.CONFIG_KV.put(ARTICLES_KV_KEY, body);
    return 'config-kv';
  }
  throw new Error('REPORTS_BUCKET or CONFIG_KV binding is required to persist fetched articles');
}

function filterCachedArticles(articles, monitoringConfig) {
  return (articles || [])
    .filter((article) => article && (article.title || article.description || article.link))
    .filter((article) => articleMatchesMonitoringConfig(article, monitoringConfig))
    .slice(0, 5000);
}

export async function loadArticles(context, { country = '', limit = 200, geoOnly = false } = {}) {
  const payload = await loadArticleSet(context);
  const dedupedArticles = dedupeArticles(payload.articles || []);
  const articles = filterArticles(dedupedArticles, { country, limit, geoOnly });
  return {
    articles,
    total: dedupedArticles.length,
    rawTotal: payload.articles.length,
    returned: articles.length,
    lastFetch: payload.lastFetch,
    source: payload.source,
  };
}

export async function refreshArticles(context, {
  limitFeeds = 6,
  maxItemsPerFeed = 4,
  translationLimit = null,
  batchOffset = 0,
  concurrency = 1,
  reprocessExisting = false,
} = {}) {
  if (!context.env.CONFIG_KV && !context.env.REPORTS_BUCKET) {
    throw new Error('REPORTS_BUCKET or CONFIG_KV binding is required to persist fetched articles');
  }

  const feedsPayload = await readAssetJson(context, '/data/feeds-config.json', { feeds: [] });
  const monitoringConfig = await loadMonitoringConfig(context);
  const safeLimitFeeds = Math.max(1, Math.min(readPositiveInt(limitFeeds, 150), 200));
  const safeMaxItems = Math.max(1, Math.min(readPositiveInt(maxItemsPerFeed, 4), 25));
  const safeConcurrency = Math.max(1, Math.min(readPositiveInt(concurrency, 1), 6));
  const safeBatchOffset = Math.max(0, readNonNegativeInt(batchOffset, 0));
  const configuredTranslationLimit = readNonNegativeInt(context.env.RSS_TRANSLATION_LIMIT, DEFAULT_TRANSLATION_LIMIT);
  const safeTranslationLimit = translationLimit === null
    ? configuredTranslationLimit
    : Math.min(configuredTranslationLimit, readNonNegativeInt(translationLimit, 4));
  const allEnabledFeeds = (feedsPayload.feeds || [])
    .filter((feed) => feed?.enabled !== false && feed.url);
  const enabledFeeds = allEnabledFeeds.slice(safeBatchOffset, safeBatchOffset + safeLimitFeeds);
  const before = await loadArticleSet(context);
  const fetchedAt = new Date().toISOString();
  const nextArticles = [];
  const feedResults = [];
  const translationState = {
    enabled: context.env.TRANSLATE_RSS_ARTICLES !== 'false',
    remaining: safeTranslationLimit,
    translated: 0,
    failed: 0,
    skipped: 0,
  };
  const existing = reprocessExisting
    ? await reprocessExistingArticles(before.articles || [], monitoringConfig, translationState)
    : preserveExistingArticles(before.articles || []);

  await setArticleFetchStatus(context.env, {
    running: true,
    startedAt: fetchedAt,
    message: `Fetching ${enabledFeeds.length} RSS feeds`,
    checkedFeeds: 0,
  });
  await appendReportLog(context.env, {
    category: 'rss',
    message: `RSS fetch started for ${enabledFeeds.length} feeds`,
    details: {
      limitFeeds: enabledFeeds.length,
      batchOffset: safeBatchOffset,
      totalEnabledFeeds: allEnabledFeeds.length,
      concurrency: safeConcurrency,
      maxItemsPerFeed: safeMaxItems,
      translationLimit: safeTranslationLimit,
      reprocessExisting,
      existingArticles: existing.length,
    },
  });

  for (let index = 0; index < enabledFeeds.length; index += safeConcurrency) {
    const batch = enabledFeeds.slice(index, index + safeConcurrency);
    const results = await Promise.all(batch.map(async (feed) => {
      try {
        const result = await fetchFeedArticles(feed, {
          maxItemsPerFeed: safeMaxItems,
          fetchedAt,
          monitoringConfig,
          translationState,
        });
        return { feed, result };
      } catch (err) {
        return { feed, error: err };
      }
    }));

    for (const item of results) {
      if (item.error) {
        feedResults.push({
          id: item.feed.id || item.feed.name || item.feed.url,
          name: item.feed.name || item.feed.id || item.feed.url,
          url: item.feed.url,
          ok: false,
          count: 0,
          error: item.error.message,
        });
      } else {
        nextArticles.push(...item.result.articles);
        feedResults.push({
          id: item.feed.id || item.feed.name || item.feed.url,
          name: item.feed.name || item.feed.id || item.feed.url,
          url: item.feed.url,
          ok: true,
          count: item.result.articles.length,
          ...item.result.stats,
        });
      }
    }
    await setArticleFetchStatus(context.env, {
      running: true,
      startedAt: fetchedAt,
      message: `Fetched ${feedResults.length}/${enabledFeeds.length} feeds`,
      checkedFeeds: feedResults.length,
      totalFeeds: enabledFeeds.length,
      totalEnabledFeeds: allEnabledFeeds.length,
      batchOffset: safeBatchOffset,
      concurrency: safeConcurrency,
    });
    if (feedResults.length === enabledFeeds.length || feedResults.length % 10 === 0) {
      await appendReportLog(context.env, {
        category: 'rss',
        message: `RSS fetch progress ${feedResults.length}/${enabledFeeds.length}`,
        details: {
          accepted: nextArticles.length,
          unmatched: feedResults.reduce((sum, item) => sum + Number(item.skippedUnmatched || 0), 0),
          failures: feedResults.filter((item) => !item.ok).length,
          concurrency: safeConcurrency,
        },
      });
    }
  }

  const combinedBeforeDedupe = [...nextArticles, ...existing];
  const merged = dedupeArticles(combinedBeforeDedupe)
    .sort((a, b) => articleTimestamp(b) - articleTimestamp(a))
    .slice(0, 5000);
  const duplicatesRemoved = Math.max(0, combinedBeforeDedupe.length - merged.length);

  const storageSource = await writeArticlePayload(context.env, {
    version: 1,
    lastFetch: fetchedAt,
    articles: merged,
    feedResults: feedResults.slice(0, 200),
    monitoring: {
      countries: monitoringConfig.countries.length,
      topics: monitoringConfig.topics.length,
    },
    translation: {
      enabled: translationState.enabled,
      translated: translationState.translated,
      failed: translationState.failed,
      skipped: translationState.skipped,
    },
  });

  await setArticleFetchStatus(context.env, {
    running: false,
    phase: 'complete',
    message: `Fetched ${nextArticles.length} topic-matched articles from ${enabledFeeds.length} feeds`,
    lastFetch: fetchedAt,
    checkedFeeds: enabledFeeds.length,
    totalFeeds: enabledFeeds.length,
    totalEnabledFeeds: allEnabledFeeds.length,
    batchOffset: safeBatchOffset,
    concurrency: safeConcurrency,
    articlesAdded: nextArticles.length,
    totalArticles: merged.length,
    duplicatesRemoved,
    translatedArticles: translationState.translated,
    unmatchedArticles: feedResults.reduce((sum, item) => sum + Number(item.skippedUnmatched || 0), 0),
    feedFailures: feedResults.filter((item) => !item.ok).length,
    storageSource,
  });
  await appendReportLog(context.env, {
    category: 'rss',
    message: `RSS fetch complete: ${nextArticles.length} topic-matched articles`,
    details: {
      feedsChecked: enabledFeeds.length,
      totalEnabledFeeds: allEnabledFeeds.length,
      batchOffset: safeBatchOffset,
      concurrency: safeConcurrency,
      totalArticles: merged.length,
      duplicatesRemoved,
      translatedArticles: translationState.translated,
      translationFailures: translationState.failed,
      unmatchedArticles: feedResults.reduce((sum, item) => sum + Number(item.skippedUnmatched || 0), 0),
      feedFailures: feedResults.filter((item) => !item.ok).length,
      storageSource,
    },
  });

  return {
    articlesAdded: nextArticles.length,
    totalArticles: merged.length,
    duplicatesRemoved,
    feedsChecked: enabledFeeds.length,
    totalEnabledFeeds: allEnabledFeeds.length,
    batchOffset: safeBatchOffset,
    concurrency: safeConcurrency,
    storageSource,
    feedResults,
    lastFetch: fetchedAt,
  };
}

function articleTimestamp(article) {
  const value = article?.pubDate || article?.publishedAt || article?.date || article?.fetchedAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

export async function getArticleFetchStatus(env) {
  if (!env.CONFIG_KV) return null;
  const raw = await env.CONFIG_KV.get(ARTICLE_FETCH_STATUS_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function setArticleFetchStatus(env, status) {
  if (!env.CONFIG_KV) return;
  try {
    await env.CONFIG_KV.put(ARTICLE_FETCH_STATUS_KEY, JSON.stringify({
      updatedAt: new Date().toISOString(),
      ...status,
    }));
  } catch (err) {
    console.warn(`Article fetch status write skipped: ${err.message}`);
  }
}

async function fetchFeedArticles(feed, { maxItemsPerFeed, fetchedAt, monitoringConfig, translationState }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), 12000);
  try {
    const response = await fetch(feed.url, {
      headers: {
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
        'user-agent': 'ConflictMapper/1.0 (+https://conflict-mapper.pages.dev)',
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_FEED_BYTES) throw new Error(`Feed too large: ${length} bytes`);

    const text = await response.text();
    if (text.length > MAX_FEED_BYTES) throw new Error(`Feed too large: ${text.length} bytes`);
    return parseFeedXml(text, feed, { maxItemsPerFeed, fetchedAt, monitoringConfig, translationState });
  } finally {
    clearTimeout(timer);
  }
}

async function parseFeedXml(xml, feed, { maxItemsPerFeed, fetchedAt, monitoringConfig, translationState }) {
  const itemSegments = extractSegments(xml, 'item');
  const entrySegments = itemSegments.length ? [] : extractSegments(xml, 'entry');
  const segments = (itemSegments.length ? itemSegments : entrySegments).slice(0, maxItemsPerFeed);
  const articles = [];
  const stats = {
    parsed: 0,
    skippedInvalid: 0,
    skippedUnmatched: 0,
    translated: 0,
    geotagged: 0,
  };

  for (const segment of segments) {
    stats.parsed += 1;
    const rawTitle = cleanText(readTag(segment, 'title'));
    const rawDescription = cleanText(readTag(segment, 'description') || readTag(segment, 'summary') || readTag(segment, 'content:encoded') || readTag(segment, 'content'));
    const link = cleanText(readTag(segment, 'link')) || readAtomLink(segment) || feed.url;
    if (!rawTitle || !link) {
      stats.skippedInvalid += 1;
      continue;
    }

    const pubDate = normalizeDate(readTag(segment, 'pubDate') || readTag(segment, 'published') || readTag(segment, 'updated') || fetchedAt);
    const translated = await maybeTranslateArticle(rawTitle, rawDescription, translationState);
    const title = translated.title;
    const description = translated.description;
    const combined = `${title} ${description}`;
    const geo = geotagArticle(combined, feed.country, title);
    if (geo?.lat && geo?.lng) stats.geotagged += 1;
    if (translated.translated) stats.translated += 1;
    const matchedCountry = findMatchingCountry(combined, monitoringConfig);
    const article = {
      id: await articleId(link, title),
      title,
      description,
      link,
      pubDate,
      source: feed.name || feed.id || new URL(feed.url).hostname,
      sourceUrl: feed.url,
      category: classifyArticle(combined, feed.category),
      country: normalizeCountrySlug(geo?.country || matchedCountry?.slug || feed.country || 'global'),
      geo,
      tags: buildTags(combined, feed.category),
      fetchedAt,
      language: translated.language,
      translated: translated.translated,
      ...(translated.translated ? {
        originalTitle: rawTitle,
        originalDescription: rawDescription,
      } : {}),
    };

    if (!articleMatchesMonitoringConfig(article, monitoringConfig)) {
      stats.skippedUnmatched += 1;
      continue;
    }
    articles.push(article);
  }

  return { articles, stats };
}

function normalizeExistingArticles(articles, monitoringConfig) {
  const result = [];
  for (const article of articles || []) {
    const normalized = normalizeExistingArticle(article, monitoringConfig);
    if (normalized && articleMatchesMonitoringConfig(normalized, monitoringConfig)) result.push(normalized);
  }
  return result;
}

function preserveExistingArticles(articles) {
  return (articles || [])
    .filter((article) => article && (article.title || article.description || article.link))
    .slice(0, 5000);
}

async function reprocessExistingArticles(articles, monitoringConfig, translationState) {
  const result = [];
  for (const article of articles || []) {
    const translated = article.translated
      ? { title: article.title, description: article.description || '', language: article.language || 'en', translated: true }
      : await maybeTranslateArticle(article.title || '', article.description || '', translationState);
    const normalized = normalizeExistingArticle({
      ...article,
      title: translated.title || article.title,
      description: translated.description || article.description,
      language: translated.language || article.language,
      translated: translated.translated || article.translated || false,
      ...(translated.translated ? {
        originalTitle: article.originalTitle || article.title,
        originalDescription: article.originalDescription || article.description,
      } : {}),
    }, monitoringConfig);
    if (normalized && articleMatchesMonitoringConfig(normalized, monitoringConfig)) result.push(normalized);
  }
  return result;
}

function normalizeExistingArticle(article, monitoringConfig) {
  if (!article) return null;
  const title = cleanText(article.title || article.headline || '');
  const description = cleanText(article.description || article.summary || '');
  const link = article.link || article.url || article.href || '';
  if (!title && !description) return null;

  const combined = `${title} ${description} ${article.geo?.place || ''} ${article.geo?.country || ''}`;
  const freshGeo = geotagArticle(combined, article.country || article.geo?.country || 'global', title);
  const existingGeo = validNonGenericGeo(article.geo) ? article.geo : null;
  const geo = freshGeo || existingGeo;
  const matchedCountry = findMatchingCountry(combined, monitoringConfig);
  const category = classifyArticle(combined, article.category);
  const tags = Array.from(new Set([
    ...buildTags(combined, category),
    ...((article.tags || []).filter(Boolean)),
  ])).slice(0, 12);

  return {
    ...article,
    title,
    description,
    link,
    url: article.url || link,
    pubDate: normalizeDate(article.pubDate || article.publishedAt || article.date || article.fetchedAt || new Date().toISOString()),
    source: article.source || article.feed || 'Unknown',
    category,
    country: normalizeCountrySlug(geo?.country || matchedCountry?.slug || article.country || 'global'),
    geo,
    tags,
    language: article.language || detectArticleLanguage(combined),
  };
}

function validNonGenericGeo(geo) {
  if (!geo) return false;
  const lat = Number(geo.lat);
  const lng = Number(geo.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (String(geo.country || '').toLowerCase() === 'global') return false;
  const place = String(geo.place || '').toLowerCase();
  const country = String(geo.country || '').toLowerCase();
  const confidence = Number(geo.confidence ?? 0.72);
  const genericPlaces = new Set([
    'global', 'world', 'american', 'chinese', 'german', 'ukrainian',
    'iranian', 'indian', 'israeli', 'hezbollah', 'houthi', 'hamas',
  ]);
  if (confidence < 0.6) return false;
  if (genericPlaces.has(place)) return false;
  if (country === 'global' || country === 'world') return false;
  return true;
}

function extractSegments(xml, tagName) {
  const regex = new RegExp(`<${tagName}\\b[\\s\\S]*?<\\/${tagName}>`, 'gi');
  return xml.match(regex) || [];
}

function readTag(segment, tagName) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = segment.match(new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  return match ? decodeEntities(stripCdata(match[1])) : '';
}

function readAtomLink(segment) {
  const match = segment.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return match ? decodeEntities(match[1]) : '';
}

function cleanText(value) {
  return decodeEntities(String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());
}

function stripCdata(value) {
  return String(value || '').replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
}

function decodeEntities(value) {
  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  };
  return String(value || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity) => {
    const key = entity.toLowerCase();
    if (key[0] === '#') {
      const code = key[1] === 'x' ? Number.parseInt(key.slice(2), 16) : Number.parseInt(key.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    }
    return named[key] || _;
  });
}

function readPositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function readNonNegativeInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

async function maybeTranslateArticle(title, description, translationState) {
  const language = detectArticleLanguage(`${title} ${description}`);
  if (!translationState?.enabled || language === 'en') {
    return { title, description, language, translated: false };
  }

  if (translationState.remaining <= 0) {
    translationState.skipped += 1;
    return { title, description, language, translated: false, skipped: 'translation_limit' };
  }

  translationState.remaining -= 1;
  try {
    const translatedTitle = await translateTextToEnglish(title);
    const translatedDescription = description ? await translateTextToEnglish(description.slice(0, 1600)) : '';
    const nextTitle = translatedTitle || title;
    const nextDescription = translatedDescription || description;
    const changed = nextTitle !== title || nextDescription !== description;
    if (changed) translationState.translated += 1;
    return {
      title: nextTitle,
      description: nextDescription,
      language,
      translated: changed,
    };
  } catch (_) {
    translationState.failed += 1;
    return { title, description, language, translated: false, translationError: true };
  }
}

function detectArticleLanguage(text) {
  const value = String(text || '');
  if (/[\u3040-\u30ff]/.test(value)) return 'ja';
  if (/[\u4e00-\u9fff]/.test(value)) return 'zh';
  if (/[\uac00-\ud7af]/.test(value)) return 'ko';
  if (/[\u0400-\u04ff]/.test(value)) return 'ru';
  if (/[\u0600-\u06ff]/.test(value)) return 'ar';
  return 'en';
}

async function translateTextToEnglish(text) {
  const value = String(text || '').trim();
  if (!value) return '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), 5000);
  try {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(value)}`, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`translate HTTP ${response.status}`);
    const data = await response.json();
    return (data?.[0] || [])
      .map((part) => Array.isArray(part) ? part[0] : '')
      .filter(Boolean)
      .join('')
      .trim();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

async function articleId(link, title) {
  const bytes = new TextEncoder().encode(`${link}|${title}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

function dedupeArticles(articles) {
  const seenExact = new Set();
  const groupsByStory = new Map();
  const result = [];
  const sorted = [...articles].sort((a, b) => articleContextPriority(b) - articleContextPriority(a)
    || articleTimestamp(b) - articleTimestamp(a));

  for (const article of sorted) {
    const key = articleCanonicalKey(article);
    if (!key || seenExact.has(key)) continue;
    seenExact.add(key);

    const storyKey = articleStoryKey(article);
    const existing = storyKey ? groupsByStory.get(storyKey) : null;
    if (existing) {
      existing.additionalReporting = [
        ...(existing.additionalReporting || []),
        compactArticleReference(article),
      ].slice(0, 12);
      continue;
    }

    const primary = { ...article };
    if (storyKey) groupsByStory.set(storyKey, primary);
    result.push(primary);
  }
  return result;
}

function articleCanonicalKey(article) {
  const link = String(article.link || article.url || '').trim();
  if (link) {
    try {
      const url = new URL(link);
      url.hash = '';
      url.search = '';
      const host = url.hostname.replace(/^www\./, '').toLowerCase();
      const pathname = url.pathname.replace(/\/+$/, '').toLowerCase();
      if (host.includes('news.google.com')) return articleStoryKey(article) || `${host}${pathname}`;
      return `${host}${pathname}`;
    } catch (_) {
      return link.toLowerCase().replace(/[?#].*$/, '').replace(/\/+$/, '');
    }
  }
  return String(article.id || article.title || '').toLowerCase();
}

function articleContextPriority(article) {
  const text = ` ${[
    article.title,
    article.description,
    article.source,
    article.category,
    article.country,
    article.geo?.place,
    article.geo?.country,
    ...(article.tags || []),
  ].filter(Boolean).join(' ').toLowerCase()} `;
  const category = String(article.category || '').toLowerCase();
  const source = String(article.source || '').toLowerCase();
  const timestamp = articleTimestamp(article);
  const ageHours = timestamp ? Math.max(0, (Date.now() - timestamp) / 3_600_000) : 10_000;
  let score = Math.max(0, 48 - Math.min(ageHours, 48));

  const categoryWeights = {
    military: 18,
    geopolitics: 18,
    cyber: 16,
    infrastructure: 16,
    nuclear: 16,
    maritime: 15,
    energy: 14,
    economic: 13,
    technology: 12,
    political: 10,
    research: 9,
    breaking: 8,
    science: 5,
  };
  score += categoryWeights[category] || 6;

  if (/(missile|drone|airstrike|warship|troops?|nuclear|uranium|iaea|sanctions?|cyberattack|ransomware|subsea cable|pipeline|shipping lane|taiwan strait|south china sea|red sea|black sea|hormuz|gaza|iran|israel|ukraine|russia|china|north korea|nato|critical infrastructure|semiconductor|export control)/.test(text)) {
    score += 18;
  }
  if (/(reuters|associated press|ap news|bbc|financial times|new york times|bloomberg|foreign policy|war on the rocks|csis|rusi|rand|iiss|atlantic council|usni|breaking defense|defense news|defence|radio free europe)/.test(source)) {
    score += 8;
  }
  if (/google news/.test(source)) score -= 5;
  if (/top stories/.test(source) && !/(war|military|security|gaza|iran|ukraine|china|russia|nato|cyber|maritime|energy)/.test(text)) score -= 8;
  if (article.geo?.place || article.geo?.country) score += 4;
  if (article.link || article.url) score += 2;
  if (article.translated) score -= 1;
  return score;
}

function articleStoryKey(article) {
  const title = String(article.title || '').toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!title) return '';

  const stop = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'over', 'after', 'before',
    'says', 'said', 'new', 'live', 'news', 'update', 'updates', 'analysis', 'report',
    'a', 'an', 'to', 'of', 'in', 'on', 'as', 'by', 'at', 'is', 'are', 'be', 'was', 'were',
  ]);
  const tokens = title.split(' ')
    .filter((token) => token.length > 2 && !stop.has(token))
    .slice(0, 16);
  if (tokens.length < 3) return title.slice(0, 90);
  return tokens.sort().slice(0, 12).join('|');
}

function compactArticleReference(article) {
  return {
    id: article.id || '',
    title: article.title || '',
    source: article.source || '',
    link: article.link || article.url || '',
    pubDate: article.pubDate || article.publishedAt || '',
    category: article.category || '',
  };
}

function classifyArticle(text, fallback = 'breaking') {
  const value = ` ${String(text || '').toLowerCase()} `;
  if (/( missile| drone| airstrike| warship| defense| defence| military| troop| weapon| nato| army| navy| air force )/.test(value)) return 'military';
  if (/( cyber| ransomware| malware| telecom| satellite| space| ai | artificial intelligence| semiconductor| chip )/.test(value)) return 'technology';
  if (/( oil| gas| energy| shipping| port| supply chain| sanctions| market| trade )/.test(value)) return 'economic';
  if (/( election| diplomacy| minister| president| parliament| un | treaty )/.test(value)) return 'political';
  return fallback || 'breaking';
}

function geotagArticle(text, fallbackCountry = 'global', priorityText = '') {
  const value = normalizeSearchText(text);
  const priorityValue = normalizeSearchText(priorityText);
  let best = null;
  for (const place of GEO_SEARCH_PLACES) {
    if (isGenericGeoPlace(place)) continue;
    for (const term of place.terms) {
      const position = searchTermIndex(value, term);
      if (position < 0) continue;
      const priorityPosition = searchTermIndex(priorityValue, term);
      const score = normalizeSearchText(term).trim().length
        + (priorityPosition >= 0 ? 1000 : 0)
        + geoPlaceSpecificityBoost(place)
        + Number(place.confidence || 0);
      if (!best || score > best.score || (score === best.score && position < best.position)) {
        best = { place, score, position };
      }
    }
  }
  if (best) {
    return {
      lat: best.place.lat,
      lng: best.place.lng,
      place: best.place.place,
      country: best.place.country,
      confidence: best.place.confidence || 0.82,
    };
  }

  return null;
}

function isGenericGeoPlace(place) {
  const generic = new Set([
    'global', 'world',
  ]);
  return generic.has(String(place.place || '').toLowerCase());
}

function geoPlaceSpecificityBoost(place) {
  const genericPlaces = new Set([
    'united states', 'china', 'taiwan', 'russia', 'ukraine', 'iran', 'israel',
    'north korea', 'south korea', 'japan', 'philippines', 'india', 'pakistan',
    'nato / brussels', 'canada', 'mexico', 'brazil', 'australia', 'new zealand',
    'united kingdom', 'france', 'germany', 'italy', 'spain', 'netherlands',
    'poland', 'romania', 'serbia', 'greece', 'turkey', 'sweden', 'finland',
    'norway', 'denmark', 'saudi arabia', 'united arab emirates', 'qatar',
    'kuwait', 'bahrain', 'oman', 'iraq', 'syria', 'jordan', 'lebanon',
    'afghanistan', 'egypt', 'sudan', 'ethiopia', 'somalia', 'kenya', 'nigeria',
    'south africa', 'libya', 'mali', 'niger', 'burkina faso',
    'democratic republic of congo', 'morocco', 'algeria', 'indonesia',
    'malaysia', 'thailand', 'vietnam', 'myanmar', 'singapore', 'bangladesh',
    'sri lanka', 'nepal', 'kazakhstan', 'uzbekistan', 'azerbaijan', 'armenia',
    'georgia', 'argentina', 'chile', 'colombia', 'venezuela', 'peru',
    'ecuador', 'bolivia', 'paraguay', 'uruguay', 'guyana',
  ]);
  return genericPlaces.has(String(place?.place || '').toLowerCase()) ? 0 : 250;
}

function buildTags(text, fallback) {
  const value = String(text || '').toLowerCase();
  const tags = new Set([fallback || 'breaking']);
  for (const [tag, terms] of Object.entries({
    taiwan: ['taiwan', 'strait', 'pla'],
    china: ['china', 'chinese', 'beijing'],
    russia: ['russia', 'russian', 'moscow'],
    ukraine: ['ukraine', 'kyiv'],
    iran: ['iran', 'tehran'],
    israel: ['israel', 'gaza'],
    cyber: ['cyber', 'ransomware', 'malware'],
    infrastructure: ['power grid', 'telecom', 'subsea cable', 'pipeline', 'port', 'rail', 'airport'],
    maritime: ['shipping', 'vessel', 'port', 'sea', 'strait', 'red sea', 'black sea', 'south china sea'],
    energy: ['oil', 'gas', 'lng', 'pipeline', 'refinery', 'electricity'],
    nuclear: ['nuclear', 'uranium', 'iaea', 'warhead'],
    terrorism: ['terror', 'insurgent', 'isis', 'al qaeda', 'hezbollah', 'houthi', 'hamas'],
    ai: [' ai ', 'artificial intelligence', 'semiconductor', 'chip'],
    robotics: ['robot', 'robotics', 'autonomous', 'unmanned', 'uav', 'uas'],
  })) {
    if (terms.some((term) => value.includes(term))) tags.add(tag);
  }
  return Array.from(tags).slice(0, 8);
}

function normalizeSearchText(value) {
  return ` ${String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}.]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

function hasSearchTerm(normalizedText, term) {
  return searchTermIndex(normalizedText, term) >= 0;
}

function searchTermIndex(normalizedText, term) {
  const normalizedTerm = normalizeSearchText(term).trim();
  if (!normalizedTerm) return -1;
  if (/^[a-z0-9.]+$/i.test(normalizedTerm)) {
    return normalizedText.indexOf(` ${normalizedTerm} `);
  }
  return normalizedText.indexOf(normalizedTerm);
}

function normalizeCountrySlug(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'global';
  const aliases = {
    'united states': 'usa',
    us: 'usa',
    'u.s.': 'usa',
    america: 'usa',
    'north korea': 'north-korea',
    dprk: 'north-korea',
    'south korea': 'south-korea',
    nato: 'nato',
  };
  return aliases[normalized] || normalized.replace(/\s+/g, '-');
}
