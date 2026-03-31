/**
 * geocoder.js — Simple keyword-based geocoder for Conflict Mapper
 *
 * No external API required. Uses a hardcoded lookup table of countries,
 * capitals, major cities, conflict zones, and military/strategic locations.
 *
 * Usage:
 *   const { geocode } = require('./geocoder');
 *   const result = geocode("Russian forces near Kyiv");
 *   // → { lat: 50.45, lng: 30.52, country: 'Ukraine', place: 'Kyiv', confidence: 0.9 }
 */

// ─────────────────────────────────────────────────────────────────────────────
// LOCATION DATABASE
// Keys are lowercase for case-insensitive matching.
// Each entry: { lat, lng, country, type }
// type: 'country' | 'capital' | 'city' | 'region' | 'base' | 'zone'
// ─────────────────────────────────────────────────────────────────────────────
const LOCATIONS = {
  // ── GLOBAL / ORGANIZATIONS ──────────────────────────────────────────────
  'united nations':       { lat: 40.75, lng: -73.97, country: 'USA',          type: 'org' },
  'nato':                 { lat: 50.88, lng:   4.42, country: 'Belgium',       type: 'org' },
  'european union':       { lat: 50.85, lng:   4.35, country: 'Belgium',       type: 'org' },
  'eu':                   { lat: 50.85, lng:   4.35, country: 'Belgium',       type: 'org' },
  'g7':                   { lat: 51.50, lng:  -0.12, country: 'UK',            type: 'org' },
  'g20':                  { lat:  0.00, lng:   0.00, country: 'Global',        type: 'org' },

  // ── USA ─────────────────────────────────────────────────────────────────
  'united states':        { lat: 38.90, lng: -77.03, country: 'USA',          type: 'country' },
  'united states of america': { lat: 38.90, lng: -77.03, country: 'USA',      type: 'country' },
  'usa':                  { lat: 38.90, lng: -77.03, country: 'USA',          type: 'country' },
  'america':              { lat: 38.90, lng: -77.03, country: 'USA',          type: 'country' },
  'american':             { lat: 38.90, lng: -77.03, country: 'USA',          type: 'country' },
  'washington':           { lat: 38.90, lng: -77.03, country: 'USA',          type: 'capital' },
  'washington dc':        { lat: 38.90, lng: -77.03, country: 'USA',          type: 'capital' },
  'pentagon':             { lat: 38.87, lng: -77.05, country: 'USA',          type: 'base' },
  'new york':             { lat: 40.71, lng: -74.00, country: 'USA',          type: 'city' },
  'los angeles':          { lat: 34.05, lng: -118.24, country: 'USA',         type: 'city' },
  'chicago':              { lat: 41.88, lng: -87.63, country: 'USA',          type: 'city' },
  'houston':              { lat: 29.76, lng: -95.37, country: 'USA',          type: 'city' },
  'miami':                { lat: 25.77, lng: -80.19, country: 'USA',          type: 'city' },
  'san francisco':        { lat: 37.77, lng: -122.42, country: 'USA',         type: 'city' },
  'pentagon':             { lat: 38.87, lng: -77.06, country: 'USA',          type: 'base' },
  'langley':              { lat: 38.95, lng: -77.15, country: 'USA',          type: 'base' },
  'joint base pearl harbor': { lat: 21.36, lng: -157.97, country: 'USA',     type: 'base' },
  'guam':                 { lat: 13.44, lng: 144.79, country: 'USA',          type: 'territory' },
  'okinawa':              { lat: 26.33, lng: 127.80, country: 'Japan',        type: 'base' },
  'camp humphreys':       { lat: 36.97, lng: 126.99, country: 'South Korea', type: 'base' },
  'ramstein':             { lat: 49.44, lng:   7.60, country: 'Germany',      type: 'base' },

  // ── RUSSIA ──────────────────────────────────────────────────────────────
  'russia':               { lat: 55.75, lng:  37.62, country: 'Russia',       type: 'country' },
  'russian':              { lat: 55.75, lng:  37.62, country: 'Russia',       type: 'country' },
  'moscow':               { lat: 55.75, lng:  37.62, country: 'Russia',       type: 'capital' },
  'kremlin':              { lat: 55.75, lng:  37.62, country: 'Russia',       type: 'capital' },
  'saint petersburg':     { lat: 59.93, lng:  30.32, country: 'Russia',       type: 'city' },
  'st. petersburg':       { lat: 59.93, lng:  30.32, country: 'Russia',       type: 'city' },
  'vladivostok':          { lat: 43.12, lng: 131.90, country: 'Russia',       type: 'city' },
  'kaliningrad':          { lat: 54.71, lng:  20.51, country: 'Russia',       type: 'region' },
  'crimea':               { lat: 45.35, lng:  34.10, country: 'Ukraine',      type: 'zone' },
  'sevastopol':           { lat: 44.60, lng:  33.53, country: 'Ukraine',      type: 'city' },
  'murmansk':             { lat: 68.97, lng:  33.08, country: 'Russia',       type: 'city' },
  'novosibirsk':          { lat: 54.99, lng:  82.90, country: 'Russia',       type: 'city' },
  'chelyabinsk':          { lat: 55.15, lng:  61.43, country: 'Russia',       type: 'city' },
  'siberia':              { lat: 60.00, lng:  90.00, country: 'Russia',       type: 'region' },
  'ukraine war':          { lat: 49.00, lng:  32.00, country: 'Ukraine',      type: 'zone' },
  'donbas':               { lat: 48.00, lng:  37.80, country: 'Ukraine',      type: 'zone' },
  'zaporizhzhia':         { lat: 47.83, lng:  35.14, country: 'Ukraine',      type: 'city' },
  'mariupol':             { lat: 47.10, lng:  37.55, country: 'Ukraine',      type: 'city' },
  'belgorod':             { lat: 50.60, lng:  36.60, country: 'Russia',       type: 'city' },
  'kursk':                { lat: 51.73, lng:  36.19, country: 'Russia',       type: 'city' },

  // ── UKRAINE ─────────────────────────────────────────────────────────────
  'ukraine':              { lat: 50.45, lng:  30.52, country: 'Ukraine',      type: 'country' },
  'ukrainian':            { lat: 50.45, lng:  30.52, country: 'Ukraine',      type: 'country' },
  'kyiv':                 { lat: 50.45, lng:  30.52, country: 'Ukraine',      type: 'capital' },
  'kiev':                 { lat: 50.45, lng:  30.52, country: 'Ukraine',      type: 'capital' },
  'kharkiv':              { lat: 49.99, lng:  36.23, country: 'Ukraine',      type: 'city' },
  'odessa':               { lat: 46.48, lng:  30.73, country: 'Ukraine',      type: 'city' },
  'lviv':                 { lat: 49.84, lng:  24.03, country: 'Ukraine',      type: 'city' },
  'kherson':              { lat: 46.64, lng:  32.62, country: 'Ukraine',      type: 'city' },
  'mykolaiv':             { lat: 46.96, lng:  31.99, country: 'Ukraine',      type: 'city' },
  'dnipro':               { lat: 48.46, lng:  34.98, country: 'Ukraine',      type: 'city' },
  'donetsk':              { lat: 48.00, lng:  37.80, country: 'Ukraine',      type: 'city' },
  'luhansk':              { lat: 48.57, lng:  39.31, country: 'Ukraine',      type: 'city' },
  'bakhmut':              { lat: 48.60, lng:  37.99, country: 'Ukraine',      type: 'city' },
  'avdiivka':             { lat: 48.14, lng:  37.76, country: 'Ukraine',      type: 'city' },

  // ── CHINA ───────────────────────────────────────────────────────────────
  'china':                { lat: 39.91, lng: 116.39, country: 'China',        type: 'country' },
  'chinese':              { lat: 39.91, lng: 116.39, country: 'China',        type: 'country' },
  'prc':                  { lat: 39.91, lng: 116.39, country: 'China',        type: 'country' },
  'beijing':              { lat: 39.91, lng: 116.39, country: 'China',        type: 'capital' },
  'peking':               { lat: 39.91, lng: 116.39, country: 'China',        type: 'capital' },
  'shanghai':             { lat: 31.23, lng: 121.47, country: 'China',        type: 'city' },
  'shenzhen':             { lat: 22.55, lng: 114.06, country: 'China',        type: 'city' },
  'guangzhou':            { lat: 23.13, lng: 113.26, country: 'China',        type: 'city' },
  'hong kong':            { lat: 22.32, lng: 114.17, country: 'China',        type: 'city' },
  'chengdu':              { lat: 30.66, lng: 104.07, country: 'China',        type: 'city' },
  'wuhan':                { lat: 30.58, lng: 114.27, country: 'China',        type: 'city' },
  'xinjiang':             { lat: 43.79, lng:  87.60, country: 'China',        type: 'region' },
  'tibet':                { lat: 29.65, lng:  91.12, country: 'China',        type: 'region' },
  'south china sea':      { lat: 15.00, lng: 115.00, country: 'Regional',    type: 'zone' },
  'east china sea':       { lat: 29.00, lng: 125.00, country: 'Regional',    type: 'zone' },
  'yellow sea':           { lat: 35.00, lng: 122.00, country: 'Regional',    type: 'zone' },
  'taiwan strait':        { lat: 24.50, lng: 119.50, country: 'Regional',    type: 'zone' },
  'spratly islands':      { lat:  9.80, lng: 114.50, country: 'Regional',    type: 'zone' },
  'paracel islands':      { lat: 16.50, lng: 112.20, country: 'Regional',    type: 'zone' },

  // ── TAIWAN ──────────────────────────────────────────────────────────────
  'taiwan':               { lat: 25.03, lng: 121.56, country: 'Taiwan',       type: 'country' },
  'taiwanese':            { lat: 25.03, lng: 121.56, country: 'Taiwan',       type: 'country' },
  'roc':                  { lat: 25.03, lng: 121.56, country: 'Taiwan',       type: 'country' },
  'taipei':               { lat: 25.03, lng: 121.56, country: 'Taiwan',       type: 'capital' },
  'kaohsiung':            { lat: 22.63, lng: 120.30, country: 'Taiwan',       type: 'city' },

  // ── NORTH KOREA ─────────────────────────────────────────────────────────
  'north korea':          { lat: 39.03, lng: 125.75, country: 'North Korea', type: 'country' },
  'dprk':                 { lat: 39.03, lng: 125.75, country: 'North Korea', type: 'country' },
  'pyongyang':            { lat: 39.03, lng: 125.75, country: 'North Korea', type: 'capital' },
  'panmunjom':            { lat: 37.95, lng: 126.67, country: 'Regional',    type: 'zone' },
  'demilitarized zone':   { lat: 38.00, lng: 127.00, country: 'Regional',    type: 'zone' },
  'dmz':                  { lat: 38.00, lng: 127.00, country: 'Regional',    type: 'zone' },
  'wonsan':               { lat: 39.15, lng: 127.44, country: 'North Korea', type: 'city' },

  // ── SOUTH KOREA ─────────────────────────────────────────────────────────
  'south korea':          { lat: 37.57, lng: 126.98, country: 'South Korea', type: 'country' },
  'korea':                { lat: 37.57, lng: 126.98, country: 'South Korea', type: 'country' },
  'seoul':                { lat: 37.57, lng: 126.98, country: 'South Korea', type: 'capital' },
  'busan':                { lat: 35.18, lng: 129.07, country: 'South Korea', type: 'city' },

  // ── JAPAN ───────────────────────────────────────────────────────────────
  'japan':                { lat: 35.69, lng: 139.69, country: 'Japan',        type: 'country' },
  'japanese':             { lat: 35.69, lng: 139.69, country: 'Japan',        type: 'country' },
  'tokyo':                { lat: 35.69, lng: 139.69, country: 'Japan',        type: 'capital' },
  'osaka':                { lat: 34.69, lng: 135.50, country: 'Japan',        type: 'city' },
  'senkaku':              { lat: 25.75, lng: 123.50, country: 'Regional',    type: 'zone' },

  // ── IRAN ────────────────────────────────────────────────────────────────
  'iran':                 { lat: 35.69, lng:  51.42, country: 'Iran',         type: 'country' },
  'iranian':              { lat: 35.69, lng:  51.42, country: 'Iran',         type: 'country' },
  'tehran':               { lat: 35.69, lng:  51.42, country: 'Iran',         type: 'capital' },
  'isfahan':              { lat: 32.66, lng:  51.68, country: 'Iran',         type: 'city' },
  'natanz':               { lat: 33.72, lng:  51.73, country: 'Iran',         type: 'base' },
  'fordow':               { lat: 34.88, lng:  50.99, country: 'Iran',         type: 'base' },
  'strait of hormuz':     { lat: 26.57, lng:  56.60, country: 'Regional',    type: 'zone' },
  'hormuz':               { lat: 26.57, lng:  56.60, country: 'Regional',    type: 'zone' },
  'persian gulf':         { lat: 26.00, lng:  52.00, country: 'Regional',    type: 'zone' },

  // ── ISRAEL / PALESTINE ──────────────────────────────────────────────────
  'israel':               { lat: 31.77, lng:  35.21, country: 'Israel',       type: 'country' },
  'israeli':              { lat: 31.77, lng:  35.21, country: 'Israel',       type: 'country' },
  'jerusalem':            { lat: 31.77, lng:  35.21, country: 'Israel',       type: 'capital' },
  'tel aviv':             { lat: 32.08, lng:  34.78, country: 'Israel',       type: 'city' },
  'haifa':                { lat: 32.82, lng:  34.99, country: 'Israel',       type: 'city' },
  'gaza':                 { lat: 31.50, lng:  34.47, country: 'Palestine',    type: 'zone' },
  'west bank':            { lat: 31.90, lng:  35.20, country: 'Palestine',    type: 'zone' },
  'rafah':                { lat: 31.29, lng:  34.24, country: 'Palestine',    type: 'city' },
  'lebanon':              { lat: 33.89, lng:  35.50, country: 'Lebanon',      type: 'country' },
  'beirut':               { lat: 33.89, lng:  35.50, country: 'Lebanon',      type: 'capital' },
  'hezbollah':            { lat: 33.89, lng:  35.50, country: 'Lebanon',      type: 'zone' },

  // ── INDIA ───────────────────────────────────────────────────────────────
  'india':                { lat: 28.63, lng:  77.22, country: 'India',        type: 'country' },
  'indian':               { lat: 28.63, lng:  77.22, country: 'India',        type: 'country' },
  'new delhi':            { lat: 28.63, lng:  77.22, country: 'India',        type: 'capital' },
  'delhi':                { lat: 28.63, lng:  77.22, country: 'India',        type: 'capital' },
  'mumbai':               { lat: 19.08, lng:  72.88, country: 'India',        type: 'city' },
  'bangalore':            { lat: 12.97, lng:  77.59, country: 'India',        type: 'city' },
  'chennai':              { lat: 13.08, lng:  80.27, country: 'India',        type: 'city' },
  'kolkata':              { lat: 22.57, lng:  88.36, country: 'India',        type: 'city' },
  'hyderabad':            { lat: 17.38, lng:  78.48, country: 'India',        type: 'city' },
  'line of actual control': { lat: 34.00, lng:  78.00, country: 'Regional',  type: 'zone' },
  'lac':                  { lat: 34.00, lng:  78.00, country: 'Regional',    type: 'zone' },
  'galwan valley':        { lat: 33.95, lng:  78.77, country: 'Regional',    type: 'zone' },
  'kashmir':              { lat: 34.08, lng:  74.80, country: 'India',        type: 'region' },
  'ladakh':               { lat: 34.16, lng:  77.58, country: 'India',        type: 'region' },
  'indian ocean':         { lat: -10.0, lng:  70.00, country: 'Regional',    type: 'zone' },

  // ── PAKISTAN ────────────────────────────────────────────────────────────
  'pakistan':             { lat: 33.72, lng:  73.04, country: 'Pakistan',     type: 'country' },
  'pakistani':            { lat: 33.72, lng:  73.04, country: 'Pakistan',     type: 'country' },
  'islamabad':            { lat: 33.72, lng:  73.04, country: 'Pakistan',     type: 'capital' },
  'karachi':              { lat: 24.86, lng:  67.01, country: 'Pakistan',     type: 'city' },
  'lahore':               { lat: 31.55, lng:  74.34, country: 'Pakistan',     type: 'city' },

  // ── UK / EUROPE ─────────────────────────────────────────────────────────
  'united kingdom':       { lat: 51.50, lng:  -0.12, country: 'UK',           type: 'country' },
  'uk':                   { lat: 51.50, lng:  -0.12, country: 'UK',           type: 'country' },
  'britain':              { lat: 51.50, lng:  -0.12, country: 'UK',           type: 'country' },
  'british':              { lat: 51.50, lng:  -0.12, country: 'UK',           type: 'country' },
  'london':               { lat: 51.50, lng:  -0.12, country: 'UK',           type: 'capital' },
  'france':               { lat: 48.85, lng:   2.35, country: 'France',       type: 'country' },
  'french':               { lat: 48.85, lng:   2.35, country: 'France',       type: 'country' },
  'paris':                { lat: 48.85, lng:   2.35, country: 'France',       type: 'capital' },
  'germany':              { lat: 52.52, lng:  13.40, country: 'Germany',      type: 'country' },
  'german':               { lat: 52.52, lng:  13.40, country: 'Germany',      type: 'country' },
  'berlin':               { lat: 52.52, lng:  13.40, country: 'Germany',      type: 'capital' },
  'poland':               { lat: 52.23, lng:  21.01, country: 'Poland',       type: 'country' },
  'warsaw':               { lat: 52.23, lng:  21.01, country: 'Poland',       type: 'capital' },
  'finland':              { lat: 60.17, lng:  24.94, country: 'Finland',      type: 'country' },
  'helsinki':             { lat: 60.17, lng:  24.94, country: 'Finland',      type: 'capital' },
  'sweden':               { lat: 59.33, lng:  18.07, country: 'Sweden',       type: 'country' },
  'stockholm':            { lat: 59.33, lng:  18.07, country: 'Sweden',       type: 'capital' },
  'norway':               { lat: 59.91, lng:  10.75, country: 'Norway',       type: 'country' },
  'oslo':                 { lat: 59.91, lng:  10.75, country: 'Norway',       type: 'capital' },
  'turkey':               { lat: 39.92, lng:  32.85, country: 'Turkey',       type: 'country' },
  'türkiye':              { lat: 39.92, lng:  32.85, country: 'Turkey',       type: 'country' },
  'ankara':               { lat: 39.92, lng:  32.85, country: 'Turkey',       type: 'capital' },
  'istanbul':             { lat: 41.01, lng:  28.95, country: 'Turkey',       type: 'city' },
  'bosphorus':            { lat: 41.11, lng:  29.07, country: 'Turkey',       type: 'zone' },
  'black sea':            { lat: 43.00, lng:  34.00, country: 'Regional',    type: 'zone' },
  'baltics':              { lat: 57.00, lng:  24.00, country: 'Regional',    type: 'region' },
  'estonia':              { lat: 59.44, lng:  24.75, country: 'Estonia',      type: 'country' },
  'latvia':               { lat: 56.95, lng:  24.11, country: 'Latvia',       type: 'country' },
  'lithuania':            { lat: 54.69, lng:  25.28, country: 'Lithuania',    type: 'country' },
  'romania':              { lat: 44.43, lng:  26.10, country: 'Romania',      type: 'country' },
  'bucharest':            { lat: 44.43, lng:  26.10, country: 'Romania',      type: 'capital' },
  'hungary':              { lat: 47.50, lng:  19.04, country: 'Hungary',      type: 'country' },
  'budapest':             { lat: 47.50, lng:  19.04, country: 'Hungary',      type: 'capital' },
  'czechia':              { lat: 50.08, lng:  14.42, country: 'Czechia',      type: 'country' },
  'czech republic':       { lat: 50.08, lng:  14.42, country: 'Czechia',      type: 'country' },
  'slovakia':             { lat: 48.15, lng:  17.11, country: 'Slovakia',     type: 'country' },
  'bulgaria':             { lat: 42.70, lng:  23.32, country: 'Bulgaria',     type: 'country' },
  'serbia':               { lat: 44.80, lng:  20.46, country: 'Serbia',       type: 'country' },
  'belgrade':             { lat: 44.80, lng:  20.46, country: 'Serbia',       type: 'capital' },
  'moldova':              { lat: 47.00, lng:  28.86, country: 'Moldova',      type: 'country' },
  'transnistria':         { lat: 47.10, lng:  29.36, country: 'Moldova',      type: 'zone' },
  'spain':                { lat: 40.42, lng:  -3.70, country: 'Spain',        type: 'country' },
  'madrid':               { lat: 40.42, lng:  -3.70, country: 'Spain',        type: 'capital' },
  'italy':                { lat: 41.89, lng:  12.48, country: 'Italy',        type: 'country' },
  'rome':                 { lat: 41.89, lng:  12.48, country: 'Italy',        type: 'capital' },
  'netherlands':          { lat: 52.37, lng:   4.90, country: 'Netherlands',  type: 'country' },
  'amsterdam':            { lat: 52.37, lng:   4.90, country: 'Netherlands',  type: 'capital' },
  'brussels':             { lat: 50.85, lng:   4.35, country: 'Belgium',      type: 'capital' },
  'belgium':              { lat: 50.85, lng:   4.35, country: 'Belgium',      type: 'country' },
  'switzerland':          { lat: 46.95, lng:   7.45, country: 'Switzerland',  type: 'country' },
  'geneva':               { lat: 46.20, lng:   6.14, country: 'Switzerland',  type: 'city' },

  // ── MIDDLE EAST ─────────────────────────────────────────────────────────
  'saudi arabia':         { lat: 24.69, lng:  46.72, country: 'Saudi Arabia', type: 'country' },
  'saudi':                { lat: 24.69, lng:  46.72, country: 'Saudi Arabia', type: 'country' },
  'riyadh':               { lat: 24.69, lng:  46.72, country: 'Saudi Arabia', type: 'capital' },
  'uae':                  { lat: 24.47, lng:  54.37, country: 'UAE',           type: 'country' },
  'united arab emirates': { lat: 24.47, lng:  54.37, country: 'UAE',           type: 'country' },
  'abu dhabi':            { lat: 24.47, lng:  54.37, country: 'UAE',           type: 'capital' },
  'dubai':                { lat: 25.20, lng:  55.27, country: 'UAE',           type: 'city' },
  'qatar':                { lat: 25.30, lng:  51.53, country: 'Qatar',         type: 'country' },
  'doha':                 { lat: 25.30, lng:  51.53, country: 'Qatar',         type: 'capital' },
  'iraq':                 { lat: 33.34, lng:  44.40, country: 'Iraq',          type: 'country' },
  'baghdad':              { lat: 33.34, lng:  44.40, country: 'Iraq',          type: 'capital' },
  'mosul':                { lat: 36.34, lng:  43.13, country: 'Iraq',          type: 'city' },
  'syria':                { lat: 33.51, lng:  36.29, country: 'Syria',         type: 'country' },
  'damascus':             { lat: 33.51, lng:  36.29, country: 'Syria',         type: 'capital' },
  'aleppo':               { lat: 36.20, lng:  37.16, country: 'Syria',         type: 'city' },
  'jordan':               { lat: 31.95, lng:  35.93, country: 'Jordan',        type: 'country' },
  'amman':                { lat: 31.95, lng:  35.93, country: 'Jordan',        type: 'capital' },
  'egypt':                { lat: 30.06, lng:  31.25, country: 'Egypt',         type: 'country' },
  'cairo':                { lat: 30.06, lng:  31.25, country: 'Egypt',         type: 'capital' },
  'suez canal':           { lat: 30.50, lng:  32.35, country: 'Egypt',         type: 'zone' },
  'suez':                 { lat: 30.50, lng:  32.35, country: 'Egypt',         type: 'zone' },
  'bab-el-mandeb':        { lat: 12.60, lng:  43.35, country: 'Regional',     type: 'zone' },
  'red sea':              { lat: 20.00, lng:  38.00, country: 'Regional',     type: 'zone' },
  'yemen':                { lat: 15.55, lng:  48.52, country: 'Yemen',         type: 'country' },
  "sana'a":               { lat: 15.55, lng:  44.21, country: 'Yemen',         type: 'capital' },
  'sanaa':                { lat: 15.55, lng:  44.21, country: 'Yemen',         type: 'capital' },
  'houthi':               { lat: 15.35, lng:  44.20, country: 'Yemen',         type: 'zone' },
  'houthis':              { lat: 15.35, lng:  44.20, country: 'Yemen',         type: 'zone' },
  'oman':                 { lat: 23.61, lng:  58.59, country: 'Oman',           type: 'country' },
  'muscat':               { lat: 23.61, lng:  58.59, country: 'Oman',           type: 'capital' },
  'kuwait':               { lat: 29.37, lng:  47.98, country: 'Kuwait',        type: 'country' },
  'bahrain':              { lat: 26.21, lng:  50.59, country: 'Bahrain',       type: 'country' },
  'afghanistan':          { lat: 34.52, lng:  69.18, country: 'Afghanistan',  type: 'country' },
  'kabul':                { lat: 34.52, lng:  69.18, country: 'Afghanistan',  type: 'capital' },

  // ── AFRICA ──────────────────────────────────────────────────────────────
  'africa':               { lat:  0.00, lng:  20.00, country: 'Africa',       type: 'region' },
  'sahel':                { lat: 15.00, lng:  10.00, country: 'Africa',       type: 'region' },
  'sudan':                { lat: 15.55, lng:  32.53, country: 'Sudan',         type: 'country' },
  'khartoum':             { lat: 15.55, lng:  32.53, country: 'Sudan',         type: 'capital' },
  'ethiopia':             { lat:  9.02, lng:  38.74, country: 'Ethiopia',      type: 'country' },
  'addis ababa':          { lat:  9.02, lng:  38.74, country: 'Ethiopia',      type: 'capital' },
  'somalia':              { lat:  2.05, lng:  45.34, country: 'Somalia',       type: 'country' },
  'mogadishu':            { lat:  2.05, lng:  45.34, country: 'Somalia',       type: 'capital' },
  'nigeria':              { lat:  9.07, lng:   7.40, country: 'Nigeria',       type: 'country' },
  'abuja':                { lat:  9.07, lng:   7.40, country: 'Nigeria',       type: 'capital' },
  'mali':                 { lat: 12.65, lng:  -8.00, country: 'Mali',          type: 'country' },
  'bamako':               { lat: 12.65, lng:  -8.00, country: 'Mali',          type: 'capital' },
  'niger':                { lat: 13.51, lng:   2.12, country: 'Niger',         type: 'country' },
  'niamey':               { lat: 13.51, lng:   2.12, country: 'Niger',         type: 'capital' },
  'burkina faso':         { lat: 12.37, lng:  -1.53, country: 'Burkina Faso', type: 'country' },
  'libya':                { lat: 32.90, lng:  13.18, country: 'Libya',         type: 'country' },
  'tripoli':              { lat: 32.90, lng:  13.18, country: 'Libya',         type: 'capital' },
  'drc':                  { lat: -4.32, lng:  15.32, country: 'DRC',           type: 'country' },
  'congo':                { lat: -4.32, lng:  15.32, country: 'DRC',           type: 'country' },
  'kinshasa':             { lat: -4.32, lng:  15.32, country: 'DRC',           type: 'capital' },
  'south africa':         { lat: -25.74, lng: 28.19, country: 'South Africa', type: 'country' },
  'pretoria':             { lat: -25.74, lng: 28.19, country: 'South Africa', type: 'capital' },
  'mozambique':           { lat: -25.97, lng: 32.57, country: 'Mozambique',   type: 'country' },

  // ── CENTRAL / SOUTH ASIA ────────────────────────────────────────────────
  'central asia':         { lat: 43.00, lng:  63.00, country: 'Regional',    type: 'region' },
  'kazakhstan':           { lat: 51.18, lng:  71.45, country: 'Kazakhstan',   type: 'country' },
  'astana':               { lat: 51.18, lng:  71.45, country: 'Kazakhstan',   type: 'capital' },
  'uzbekistan':           { lat: 41.30, lng:  69.24, country: 'Uzbekistan',   type: 'country' },
  'tashkent':             { lat: 41.30, lng:  69.24, country: 'Uzbekistan',   type: 'capital' },
  'tajikistan':           { lat: 38.56, lng:  68.77, country: 'Tajikistan',   type: 'country' },
  'kyrgyzstan':           { lat: 42.87, lng:  74.59, country: 'Kyrgyzstan',   type: 'country' },
  'turkmenistan':         { lat: 37.95, lng:  58.38, country: 'Turkmenistan', type: 'country' },
  'azerbaijan':           { lat: 40.41, lng:  49.87, country: 'Azerbaijan',   type: 'country' },
  'baku':                 { lat: 40.41, lng:  49.87, country: 'Azerbaijan',   type: 'capital' },
  'armenia':              { lat: 40.18, lng:  44.51, country: 'Armenia',      type: 'country' },
  'georgia':              { lat: 41.69, lng:  44.83, country: 'Georgia',      type: 'country' },
  'tbilisi':              { lat: 41.69, lng:  44.83, country: 'Georgia',      type: 'capital' },
  'nagorno-karabakh':     { lat: 39.83, lng:  46.76, country: 'Regional',    type: 'zone' },

  // ── SOUTHEAST ASIA ──────────────────────────────────────────────────────
  'southeast asia':       { lat: 13.00, lng: 101.00, country: 'Regional',    type: 'region' },
  'philippines':          { lat: 14.60, lng: 120.98, country: 'Philippines', type: 'country' },
  'manila':               { lat: 14.60, lng: 120.98, country: 'Philippines', type: 'capital' },
  'vietnam':              { lat: 21.03, lng: 105.85, country: 'Vietnam',      type: 'country' },
  'hanoi':                { lat: 21.03, lng: 105.85, country: 'Vietnam',      type: 'capital' },
  'ho chi minh':          { lat: 10.82, lng: 106.63, country: 'Vietnam',      type: 'city' },
  'thailand':             { lat: 13.75, lng: 100.52, country: 'Thailand',     type: 'country' },
  'bangkok':              { lat: 13.75, lng: 100.52, country: 'Thailand',     type: 'capital' },
  'myanmar':              { lat: 16.80, lng:  96.15, country: 'Myanmar',      type: 'country' },
  'rangoon':              { lat: 16.80, lng:  96.15, country: 'Myanmar',      type: 'capital' },
  'yangon':               { lat: 16.80, lng:  96.15, country: 'Myanmar',      type: 'capital' },
  'malaysia':             { lat:  3.15, lng: 101.70, country: 'Malaysia',     type: 'country' },
  'kuala lumpur':         { lat:  3.15, lng: 101.70, country: 'Malaysia',     type: 'capital' },
  'singapore':            { lat:  1.35, lng: 103.82, country: 'Singapore',   type: 'country' },
  'indonesia':            { lat: -6.21, lng: 106.85, country: 'Indonesia',   type: 'country' },
  'jakarta':              { lat: -6.21, lng: 106.85, country: 'Indonesia',   type: 'capital' },
  'malacca':              { lat:  2.20, lng: 102.25, country: 'Malaysia',     type: 'zone' },
  'strait of malacca':    { lat:  3.00, lng: 101.00, country: 'Regional',    type: 'zone' },

  // ── AMERICAS ────────────────────────────────────────────────────────────
  'canada':               { lat: 45.42, lng: -75.70, country: 'Canada',       type: 'country' },
  'ottawa':               { lat: 45.42, lng: -75.70, country: 'Canada',       type: 'capital' },
  'toronto':              { lat: 43.70, lng: -79.42, country: 'Canada',       type: 'city' },
  'mexico':               { lat: 19.43, lng: -99.13, country: 'Mexico',       type: 'country' },
  'mexico city':          { lat: 19.43, lng: -99.13, country: 'Mexico',       type: 'capital' },
  'brazil':               { lat: -15.78, lng: -47.93, country: 'Brazil',      type: 'country' },
  'brasilia':             { lat: -15.78, lng: -47.93, country: 'Brazil',      type: 'capital' },
  'venezuela':            { lat: 10.48, lng: -66.87, country: 'Venezuela',    type: 'country' },
  'caracas':              { lat: 10.48, lng: -66.87, country: 'Venezuela',    type: 'capital' },
  'colombia':             { lat:  4.71, lng: -74.07, country: 'Colombia',     type: 'country' },
  'bogota':               { lat:  4.71, lng: -74.07, country: 'Colombia',     type: 'capital' },
  'cuba':                 { lat: 23.13, lng: -82.38, country: 'Cuba',         type: 'country' },
  'havana':               { lat: 23.13, lng: -82.38, country: 'Cuba',         type: 'capital' },
  'argentina':            { lat: -34.61, lng: -58.38, country: 'Argentina',   type: 'country' },
  'buenos aires':         { lat: -34.61, lng: -58.38, country: 'Argentina',   type: 'capital' },

  // ── ARCTIC / STRATEGIC ──────────────────────────────────────────────────
  'arctic':               { lat: 80.00, lng:  10.00, country: 'Regional',    type: 'zone' },
  'arctic ocean':         { lat: 85.00, lng:   0.00, country: 'Regional',    type: 'zone' },
  'antarctica':           { lat: -90.0, lng:   0.00, country: 'Regional',    type: 'zone' },
  'svalbard':             { lat: 78.22, lng:  15.63, country: 'Norway',       type: 'zone' },
  'northwest passage':    { lat: 74.00, lng: -95.00, country: 'Regional',    type: 'zone' },
  'northern sea route':   { lat: 75.00, lng: 100.00, country: 'Russia',      type: 'zone' },

  // ── SPACE / CYBER ────────────────────────────────────────────────────────
  'cape canaveral':       { lat: 28.39, lng: -80.61, country: 'USA',          type: 'base' },
  'kennedy space center': { lat: 28.57, lng: -80.65, country: 'USA',          type: 'base' },
  'vandenberg':           { lat: 34.76, lng: -120.52, country: 'USA',         type: 'base' },
  'baikonur':             { lat: 45.96, lng:  63.31, country: 'Kazakhstan',   type: 'base' },
  'jiuquan':              { lat: 40.96, lng:  100.29, country: 'China',       type: 'base' },
  'wenchang':             { lat: 19.62, lng:  110.96, country: 'China',       type: 'base' },
  'satish dhawan':        { lat: 13.73, lng:  80.24, country: 'India',        type: 'base' },
};

// ─────────────────────────────────────────────────────────────────────────────
// COUNTRY SLUG → CANONICAL NAME MAP (for report routing)
// ─────────────────────────────────────────────────────────────────────────────
const COUNTRY_SLUGS = {
  'usa':         'USA',
  'russia':      'Russia',
  'china':       'China',
  'ukraine':     'Ukraine',
  'taiwan':      'Taiwan',
  'iran':        'Iran',
  'israel':      'Israel',
  'india':       'India',
  'pakistan':    'Pakistan',
  'north-korea': 'North Korea',
  'nato':        'NATO/Europe',
};

/**
 * geocode(text)
 * Scans the given text for known location names and returns the best match.
 *
 * @param {string} text - Article title + description to scan
 * @returns {{ lat: number, lng: number, country: string, place: string, confidence: number } | null}
 */
function geocode(text) {
  if (!text || typeof text !== 'string') return null;

  const lower = text.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const [keyword, data] of Object.entries(LOCATIONS)) {
    if (lower.includes(keyword)) {
      // Score based on keyword length (longer = more specific = higher confidence)
      const score = keyword.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          lat: data.lat,
          lng: data.lng,
          country: data.country,
          place: keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          type: data.type,
          confidence: Math.min(0.95, 0.4 + (score / 30)),
        };
      }
    }
  }

  return bestMatch;
}

/**
 * getCountryFromSlug(slug)
 * Converts a URL slug like 'north-korea' to a canonical name.
 */
function getCountryFromSlug(slug) {
  return COUNTRY_SLUGS[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * getAllLocations()
 * Returns the full location database (useful for populating map markers).
 */
function getAllLocations() {
  return LOCATIONS;
}

module.exports = { geocode, getCountryFromSlug, getAllLocations, COUNTRY_SLUGS };
