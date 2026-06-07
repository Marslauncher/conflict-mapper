# Global OSINT, News & Satellite Intelligence Resource Guide — Enhanced Edition

> **Scope:** News sources, OSINT tools, satellite feeds, think tanks, and investigative platforms organized by country/region. API access details and Python code examples are provided where available. Pricing is listed for all paid options. Free and open-source options are prioritized.

***

## Universal / Cross-Regional Tools

### 🛰️ Satellite Imagery — Free

#### NASA FIRMS (Fire Information for Resource Management System)
- **URL:** https://firms.modaps.eosdis.nasa.gov
- **API Docs:** https://firms.modaps.eosdis.nasa.gov/api/
- **API Key Signup (free):** https://firms.modaps.eosdis.nasa.gov/api/map_key/
- **Cost:** Free
- **Data:** Near-real-time active fire/thermal anomaly detection via MODIS & VIIRS instruments. US/Canada data is real-time; global data arrives within 3 hours of satellite observation.[^1][^2]

**Python API Example — Get active fires in Ukraine:**
```python
import requests

MAP_KEY = "YOUR_FREE_MAP_KEY"  # Sign up at firms.modaps.eosdis.nasa.gov/api/map_key
# SOURCE options: VIIRS_SNPP_NRT, MODIS_NRT, VIIRS_NOAA20_NRT
# AREA: west,south,east,north (bounding box)
# DAY_RANGE: 1–10 days back

url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_SNPP_NRT/22,44,40,52/3"
response = requests.get(url)

# Save to file for analysis
with open("ukraine_fires.csv", "w") as f:
    f.write(response.text)

print(response.text[:500])  # Preview first 500 chars
```

**Country-specific query:**
```python
# Query a specific country (use ISO 3-letter code from /api/countries/)
url = f"https://firms.modaps.eosdis.nasa.gov/api/country/csv/{MAP_KEY}/VIIRS_SNPP_NRT/PRK/7"
# PRK = North Korea, UKR = Ukraine, SYR = Syria, IRN = Iran
response = requests.get(url)
print(response.text)
```

***

#### Copernicus Data Space Ecosystem / Sentinel Hub
- **URL:** https://dataspace.copernicus.eu
- **API Docs:** https://documentation.dataspace.copernicus.eu/APIs.html
- **Browser:** https://browser.dataspace.copernicus.eu
- **Cost:** Free (Sentinel Hub APIs are now free within the Copernicus Data Space Ecosystem quota after account creation)[^3]

**Python API Example — Download Sentinel-2 imagery over Taiwan Strait:**
```python
# pip install sentinelhub
from sentinelhub import SHConfig, SentinelHubRequest, DataCollection, MimeType, BBox, CRS, bbox_to_dimensions

config = SHConfig()
config.sh_client_id = "YOUR_CLIENT_ID"       # From CDSE account
config.sh_client_secret = "YOUR_CLIENT_SECRET"

# Bounding box: Taiwan Strait region
bbox = BBox(bbox=[119.5, 24.5, 122.5, 26.5], crs=CRS.WGS84)
size = bbox_to_dimensions(bbox, resolution=60)  # 60m per pixel

evalscript = """
//VERSION=3
function setup() { return { input: ["B04","B03","B02"], output: { bands: 3 } }; }
function evaluatePixel(sample) { return [sample.B04/3000, sample.B03/3000, sample.B02/3000]; }
"""

request = SentinelHubRequest(
    evalscript=evalscript,
    input_data=[SentinelHubRequest.input_data(
        data_collection=DataCollection.SENTINEL2_L2A,
        time_interval=("2026-05-01", "2026-06-07"),
        mosaicking_order="leastCC"
    )],
    responses=[SentinelHubRequest.output_response("default", MimeType.PNG)],
    bbox=bbox,
    size=size,
    config=config
)
image = request.get_data()
# image is a numpy array — save or display with matplotlib/PIL
```

***

#### NASA Worldview / GIBS
- **URL:** https://worldview.earthdata.nasa.gov
- **API:** https://gibs.earthdata.nasa.gov (WMTS/WMS/REST)
- **Cost:** Free
- **Notes:** 900+ imagery products, updated within hours. 30-year archive. Access via any WMS-compatible GIS application.[^4]

#### USGS EarthExplorer (Landsat)
- **URL:** https://earthexplorer.usgs.gov
- **API Docs:** https://m2m.cr.usgs.gov/api/docs/json/
- **Cost:** Free
- **Notes:** Longest continuous space-based land record; includes MODIS and ASTER data.[^4]

#### Sentinel-2 Cloudless Map (EOX)
- **URL:** https://s2maps.eu
- **Cost:** Free (attribution required)[^5]

***

### 🛰️ Satellite Imagery — Paid (Commercial)

| Provider | Resolution | Pricing | API |
|----------|------------|---------|-----|
| **Maxar SecureWatch** | 30 cm | Enterprise subscription; contact sales; 48-hr holdback for Standard, 2-day for Premium[^6][^7] | Yes — OGC WMS/WCS streaming |
| **Planet Labs** | 3 m daily | $9,650/yr (Global subscription); Education & Research Program: free up to 3,000 km²/month for academics[^8][^9][^10] | Yes — [docs.planet.com](https://docs.planet.com) |
| **Airbus Pléiades Neo** | 30 cm | Archive from €3.80/km²; 30 cm tasking ~€18/km² (min. 25 km²)[^11] | Yes |
| **ICEYE (SAR)** | Sub-1 m | Contact sales; all-weather, day/night[^12] | Yes |
| **Capella Space (SAR)** | Sub-0.5 m | Contact sales[^12] | Yes |
| **Umbra (SAR)** | Sub-0.35 m | Contact sales[^12] | Yes |
| **SkyFi** | Varies | Pay-as-you-go; self-service; access 40+ providers[^13] | Yes — [skyfi.com](https://skyfi.com) |
| **BlackSky** | Sub-1 m | Contact sales; event-based rapid revisit[^12] | Yes |

***

### ✈️ Flight & Aircraft Tracking

#### OpenSky Network
- **URL:** https://opensky-network.org
- **API Docs:** https://openskynetwork.github.io/opensky-api/
- **Cost:** Free for research/non-commercial. Historical data via Trino SQL interface for universities and government organizations.[^14][^15]

**Python API Example — Track aircraft over the Korean Peninsula:**
```python
import requests
import json

# Bounding box for Korean Peninsula: lomin, lamin, lomax, lamax
lomin, lamin, lomax, lamax = 124.0, 33.0, 131.0, 43.0

url = (
    f"https://opensky-network.org/api/states/all"
    f"?lamin={lamin}&lomin={lomin}&lamax={lamax}&lomax={lomax}"
)
# Add auth for higher rate limits: requests.get(url, auth=("username","password"))
response = requests.get(url)
data = response.json()

if data and data.get("states"):
    for aircraft in data["states"][:10]:  # Show first 10
        icao24, callsign, origin_country = aircraft, aircraft[^1], aircraft[^2]
        latitude, longitude, altitude = aircraft[^6], aircraft[^5], aircraft[^7]
        print(f"ICAO: {icao24} | Call: {callsign} | Country: {origin_country} | "
              f"Lat: {latitude} | Lon: {longitude} | Alt: {altitude}m")
```

#### ADS-B Exchange (adsb.lol)
- **URL:** https://adsb.lol / https://adsbexchange.com
- **Free API:** https://api.adsb.lol (currently free; API key required in future for feeders)[^16]
- **Paid API via RapidAPI:** ~$10/month for 10,000 requests[^17]
- **Notes:** Unfiltered — includes military aircraft. Refuses government blocking requests.[^18]

**Python Example — Query military aircraft near Taiwan:**
```python
import requests

# adsb.lol free API — aircraft within bounding box
url = "https://api.adsb.lol/v2/point/25.0/121.5/250"
# Format: /v2/point/{lat}/{lon}/{radius_nm}
response = requests.get(url)
data = response.json()

for ac in data.get("ac", [])[:10]:
    print(f"ICAO: {ac.get('hex')} | Flight: {ac.get('flight','?').strip()} | "
          f"Type: {ac.get('t','?')} | Alt: {ac.get('alt_baro','?')} ft | "
          f"Military: {ac.get('military','?')}")
```

#### Flightradar24 API
- **URL:** https://fr24api.flightradar24.com
- **Docs:** https://fr24api.flightradar24.com/docs/getting-started
- **Pricing:**[^19]
  - Explorer: $9/month — 30,000 API calls
  - Essential: $99/month — 450,000 API calls
  - Advanced: $900/month — 4,050,000 API calls

```python
import requests

API_TOKEN = "YOUR_FR24_TOKEN"
headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Accept-Version": "v1"
}
# Get live flights in a bounding box
url = "https://fr24api.flightradar24.com/api/live/flight-positions/light"
params = {"bounds": "52.0,44.0,22.0,40.0"}  # Ukraine bounding box
response = requests.get(url, headers=headers, params=params)
print(response.json())
```

***

### 🚢 Vessel Tracking

#### MarineTraffic
- **URL:** https://marinetraffic.com
- **API Docs:** https://servicedocs.marinetraffic.com
- **Pricing (2025):** Switched to enterprise subscriptions only; credit system discontinued. App add-ons: Nautical Charts $6.99/mo, Weather Maps $8.99/mo.[^20][^21]
- **Free Tier:** Web map is free to view; API requires subscription.

**Python Example — Vessel lookup (requires API subscription key):**
```python
import requests

API_KEY = "YOUR_MARINETRAFFIC_API_KEY"
# Get expected arrivals at Strait of Hormuz area port
url = f"https://services.marinetraffic.com/api/expectedarrivals/v:1/{API_KEY}"
params = {
    "portid": "1456",  # Bandar Abbas, Iran
    "fromdate": "2026-06-01",
    "todate": "2026-06-07",
    "msgtype": "simple"
}
response = requests.get(url, params=params)
print(response.json())
```

#### Global Fishing Watch
- **URL:** https://globalfishingwatch.org
- **API Docs:** https://globalfishingwatch.org/our-apis/documentation
- **API Access:** Free for non-commercial use; register at globalfishingwatch.org → request API key → agree to terms[^22][^23]
- **Python Package (April 2025):** `pip install gfw-api-python-client`[^24]

```python
# pip install gfw-api-python-client
import gfw

client = gfw.GFWClient(api_key="YOUR_GFW_API_KEY")

# Get fishing events in the South China Sea
events = client.get_events(
    event_type="fishing",
    start_date="2026-05-01",
    end_date="2026-06-01",
    bbox=[109.0, 3.0, 121.0, 22.0],  # South China Sea
    limit=100
)
for event in events:
    print(event)
```

***

### ⚔️ Conflict & Geopolitical Mapping

#### ACLED (Armed Conflict Location & Event Data)
- **URL:** https://acleddata.com
- **API Docs:** https://acleddata.com/acled-api-documentation
- **Cost:** Free (register at acleddata.com/user/register for API access)[^25][^26]

**Python API Example — Get conflict events in Sudan (last 30 days):**
```python
import requests

# Step 1: Authenticate to get token
auth_response = requests.post(
    "https://acleddata.com/user/login?_format=json",
    json={"name": "your@email.com", "pass": "yourpassword"}
)
token = auth_response.json()["access_token"]

# Step 2: Query ACLED API
headers = {"Authorization": f"Bearer {token}"}
url = "https://acleddata.com/api/acled/read"
params = {
    "_format": "json",
    "country": "Sudan",
    "event_date": "2026-05-01|2026-06-07",
    "event_date_where": "BETWEEN",
    "limit": 500
}
response = requests.get(url, headers=headers, params=params)
data = response.json()

for event in data.get("data", [])[:5]:
    print(f"{event['event_date']} | {event['event_type']} | "
          f"{event['location']} | {event['actor1']} vs {event['actor2']}")
```

**Quick URL-based query (browser or curl):**
```
https://acleddata.com/api/acled/read?_format=csv&country=Ukraine&event_date=2026-05-01|2026-06-07&event_date_where=BETWEEN&limit=1000
```

***

### 🔍 General OSINT Frameworks

#### Shodan
- **URL:** https://shodan.io
- **API Docs:** https://developer.shodan.io/api
- **Pricing:**[^27]
  - Free: Basic search, limited results
  - Membership (lifetime): $49 one-time — network monitoring for 16 IPs, increased query credits
  - Freelancer: $69/month — 1M results/month
  - Small Business: $359/month
  - Corporate: $1,099/month
  - Academic: Free upgrade with .edu email[^28]

**Python Example — Find open industrial control systems (SCADA) in Iran:**
```python
# pip install shodan
import shodan

api = shodan.Shodan("YOUR_SHODAN_API_KEY")

results = api.search('country:IR port:102 "Siemens"', limit=20)
# Port 102 = Siemens S7 PLC protocol

print(f"Results found: {results['total']}")
for result in results['matches']:
    print(f"IP: {result['ip_str']} | Org: {result.get('org','?')} | "
          f"City: {result['location'].get('city','?')}")
```

#### Maltego
- **URL:** https://maltego.com
- **API/Transform Hub:** https://www.maltego.com/transform-hub/
- **Pricing:**[^29][^30][^31]
  - Basic (Community Edition): Free — 200 credits/month, visual link analysis
  - Entry: Paid, includes Maltego Search
  - Professional: ~€6,600/year — full OSINT + link analysis
  - Enterprise: Custom pricing for organizations
- **Notes:** CE includes 200 commercial data credits per month via Maltego Data Pass since 2025.[^31]

#### OpenStreetMap Overpass API
- **URL:** https://overpass-turbo.eu / https://overpass-api.de
- **Cost:** Free (10,000 queries/day limit on public instance; no-limit instance at overpass.kumi.systems)[^32]

**Python Example — Find military installations near North Korea border:**
```python
import requests

overpass_url = "https://overpass-api.de/api/interpreter"
query = """
[out:json];
(
  node["military"](37.5,124.0,43.0,131.0);
  way["military"](37.5,124.0,43.0,131.0);
);
out body;
>;
out skel qt;
"""
response = requests.post(overpass_url, data={"data": query})
data = response.json()
for element in data.get("elements", [])[:10]:
    print(f"Type: {element['type']} | ID: {element['id']} | "
          f"Tags: {element.get('tags', {})}")
```

***

### 🌐 Global Trade & Economic Intelligence (Free)

| Tool | URL | API |
|------|-----|-----|
| **UN Comtrade** | [comtradeplus.un.org](https://comtradeplus.un.org) | Yes — free registration required |
| **World Bank Open Data** | [data.worldbank.org](https://data.worldbank.org) | Yes — free, no key needed |
| **OFAC Sanctions Search** | [sanctionssearch.ofac.treas.gov](https://sanctionssearch.ofac.treas.gov) | Yes — SDN list downloadable as XML/CSV |
| **OpenSanctions** | [opensanctions.org](https://opensanctions.org) | Yes — free bulk downloads; API from €200/mo for commercial |
| **SIPRI Military Expenditure DB** | [sipri.org/databases/milex](https://sipri.org/databases/milex) | No API; bulk download available free[^33] |

***

## 1. United States

### 📰 News, Investigative & Accountability Journalism (Free)

| Source | URL | Focus |
|--------|-----|-------|
| **ProPublica** | [propublica.org](https://www.propublica.org) | Nonprofit investigative; all 50 states; corruption, corporate misconduct[^34] |
| **The Intercept** | [theintercept.com](https://theintercept.com) | NSA surveillance, intelligence, national security |
| **MuckRock** | [muckrock.com](https://muckrock.com) | FOIA filing platform; 50,000+ completed requests publicly archived |
| **AP Wire** | [apnews.com](https://apnews.com) | Primary-source breaking news |
| **Reuters** | [reuters.com](https://reuters.com) | Wire service; verified breaking news |
| **NPR News** | [npr.org/sections/news](https://www.npr.org/sections/news) | Public radio; domestic and foreign policy |
| **The Guardian US** | [theguardian.com/us-news](https://www.theguardian.com/us-news) | US politics, surveillance, civil liberties |
| **Washington Post** | [washingtonpost.com](https://washingtonpost.com) | National security, intelligence (limited free articles) |
| **Politico** | [politico.com](https://politico.com) | Congress, White House, regulatory affairs |
| **The Hill** | [thehill.com](https://thehill.com) | Congress, legislation, DC politics — free |
| **DocumentCloud** | [documentcloud.org](https://documentcloud.org) | Primary-source government document repository |
| **Just the News** | [justthenews.com](https://justthenews.com) | Conservative-leaning investigative reporting |
| **The Lever** | [levernews.com](https://levernews.com) | Corporate accountability, financial investigations |

### 🏛️ Government Records & Legal OSINT (Free)

| Tool | URL | API | Notes |
|------|-----|-----|-------|
| **PACER** | [pacer.gov](https://pacer.gov) | No | Federal court records; $0.10/page after $30/quarter threshold[^35] |
| **CourtListener / RECAP** | [courtlistener.com](https://courtlistener.com) | Yes — [courtlistener.com/api](https://www.courtlistener.com/api/) | Millions of free PACER docs; RECAP browser extension auto-uploads[^35] |
| **FOIA.gov** | [foia.gov](https://foia.gov) | No | Submit/track FOIA requests to federal agencies |
| **Congress.gov** | [congress.gov](https://congress.gov) | Yes — [api.congress.gov](https://api.congress.gov) | Bill text, votes, committee reports; free API key |
| **SEC EDGAR** | [efts.sec.gov/LATEST/search-index](https://efts.sec.gov) | Yes — EDGAR full-text search API | 10-K, 10-Q, insider trades; free |
| **FEC (Campaign Finance)** | [fec.gov/data](https://www.fec.gov/data/) | Yes — [api.open.fec.gov](https://api.open.fec.gov) | PAC donations, campaign spending; free key |
| **USASpending.gov** | [usaspending.gov](https://www.usaspending.gov) | Yes — [api.usaspending.gov](https://api.usaspending.gov) | Federal contracts including defense; free |
| **OpenSecrets** | [opensecrets.org](https://opensecrets.org) | Yes (limited free) | Lobbying, dark money, PAC tracking |
| **Violation Tracker** | [violationtracker.goodjobsfirst.org](https://violationtracker.goodjobsfirst.org) | No | Corporate misconduct database[^35] |
| **GovTrack** | [govtrack.us](https://govtrack.us) | Partial | Legislation tracking; bill text and voting records |
| **Judyrecords** | [judyrecords.com](https://judyrecords.com) | No | Free search of hundreds of millions of US court cases[^35] |

**Congress API Example:**
```python
import requests

API_KEY = "YOUR_CONGRESS_API_KEY"  # Free at api.congress.gov
url = "https://api.congress.gov/v3/bill/119/hr"
params = {
    "api_key": API_KEY,
    "limit": 20,
    "fromDateTime": "2026-01-01T00:00:00Z",
    "sort": "updateDate+desc"
}
response = requests.get(url, params=params)
bills = response.json().get("bills", [])
for bill in bills[:5]:
    print(f"Bill: {bill['number']} | Title: {bill['title'][:80]} | "
          f"Updated: {bill['updateDate']}")
```

### 📡 US Infrastructure & Geospatial (Free)

| Tool | URL | Notes |
|------|-----|-------|
| **NOAA GOES Real-Time** | [goes.noaa.gov](https://www.goes.noaa.gov) | Satellite refresh every 15 minutes[^4] |
| **NASA FIRMS US/Canada** | [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov) | Real-time fire detection for US |
| **HIFLD Open Data** | [hifld-geoplatform.opendata.arcgis.com](https://hifld-geoplatform.opendata.arcgis.com) | Homeland Infrastructure GIS layers — power, telecom, pipelines |
| **FAA Aircraft Registry** | [registry.faa.gov](https://registry.faa.gov) | Look up any N-registered aircraft owner |
| **ADS-B Exchange** | [adsbexchange.com](https://adsbexchange.com) | Unfiltered US military aircraft tracking[^18] |

### 💰 Paid US Tools

| Tool | Price | Notes |
|------|-------|-------|
| **LexisNexis / Nexis Uni** | $150–$400+/mo | Legal and news database; backgrounding individuals |
| **Palantir Gotham** | Enterprise (undisclosed) | AI-powered government intelligence integration[^36] |
| **Recorded Future** | $50K–$500K+/year[^37] | Predictive threat intelligence; cyber and geopolitical |
| **Bloomberg Terminal** | ~$2,000/month | Financial news, data, trading tools[^38] |

***

## 2. China

### 📰 News & Analysis (Free)

| Source | URL | Notes |
|--------|-----|-------|
| **South China Morning Post** | [scmp.com](https://www.scmp.com) | Hong Kong–based English reporting; now under Alibaba |
| **China Digital Times** | [chinadigitaltimes.net](https://chinadigitaltimes.net) | Censored content aggregator; propaganda analysis |
| **Caixin Global** | [caixinglobal.com](https://caixinglobal.com) | Independent financial journalism; limited free |
| **Global Times** | [globaltimes.cn](https://www.globaltimes.cn) | CCP-affiliated; monitor for official party narratives |
| **Xinhua News Agency** | [xinhuanet.com](https://xinhuanet.com) | State newswire; official positions |
| **CGTN** | [cgtn.com](https://cgtn.com) | China Global Television Network; English state media |
| **Radio Free Asia China** | [rfa.org/english/china](https://www.rfa.org/english/china) | US-funded independent China reporting |
| **The Paper (澎湃新闻)** | [thepaper.cn](https://www.thepaper.cn) | Chinese-language; covers domestic social issues |
| **Bitter Winter** | [bitterwinter.org](https://bitterwinter.org) | Religious persecution and human rights in China |
| **China Media Project** | [chinamediaproject.org](https://chinamediaproject.org) | Decodes CCP media messaging and propaganda |
| **Taiwan News** | [taiwannews.com.tw](https://www.taiwannews.com.tw) | English; covers cross-strait issues from Taiwan perspective |
| **Asia Times** | [asiatimes.com](https://asiatimes.com) | Covers PRC military, economy, and politics |

### 🏛️ Think Tanks & Research (Free)

| Source | URL | Notes |
|--------|-----|-------|
| **CSIS China Power Project** | [chinapower.csis.org](https://chinapower.csis.org) | Military, economic, and technology power analysis[^39] |
| **CSIS Asia Maritime Transparency** | [amti.csis.org](https://amti.csis.org) | South China Sea island tracker; interactive maps[^39] |
| **ASPI China Defence Universities** | [chinadefenseuniversities.com](https://chinadefenseuniversities.com) | DB of Chinese institutions in military S&T[^39] |
| **Air University CASI** | [airuniversity.af.edu/CASI](https://www.airuniversity.af.edu/CASI) | PLA aerospace capabilities; translated Chinese documents[^39] |
| **Heritage China Transparency** | [heritage.org/china-transparency-project](https://www.heritage.org/china-transparency-project) | Military and arms spending data compilation[^39] |
| **Stimson Center China** | [stimson.org/programs/china](https://www.stimson.org) | Strategy and arms control analysis |
| **RAND Corporation China** | [rand.org/topics/china.html](https://www.rand.org/topics/china.html) | Policy research on PLA and CCP |
| **Mercator Institute (MERICS)** | [merics.org](https://merics.org) | German think tank; EU-China relations and policy |

### 🔐 SOCMINT Tools (Free)

| Tool | Notes |
|------|-------|
| **Sogou WeChat Search** | Search public WeChat posts at sogou.com; filter results by "WeChat" tab[^40] |
| **BiliBili Search** | Major Chinese video platform; filter by Most Played, Latest, Comments[^40] |
| **Weibo Search** | Public posts accessible; use advanced search for dates and locations |
| **OSINTCombine China Guide** | https://osintcombine.com — OSINT methodology for China's political events[^40] |

### 💰 Paid China Tools

| Tool | Price | Notes |
|------|-------|-------|
| **Babel X** | Contact sales (~$50K+/year est.) | Mandarin multilingual OSINT across platforms[^41] |
| **Recorded Future China Desk** | $50K–$500K+/year[^37] | Chinese APT and state actor tracking |
| **IISS Military Balance+** | ~$1,800/year | Annual PLA capabilities database[^39] |
| **Jane's Intelligence** | Contact sales | PLA order of battle and equipment data |

***

## 3. Taiwan

### 📰 News & Monitoring (Free)

| Source | URL | Notes |
|--------|-----|-------|
| **Focus Taiwan (CNA)** | [focustaiwan.tw](https://focustaiwan.tw) | Official English newswire of Taiwan's Central News Agency |
| **Taipei Times** | [taipeitimes.com](https://www.taipeitimes.com) | Independent English-language daily |
| **Taiwan News** | [taiwannews.com.tw](https://www.taiwannews.com.tw) | English; strong cross-strait security coverage |
| **The Reporter Taiwan** | [twreporter.org/en](https://www.twreporter.org/en) | Investigative nonprofit journalism |
| **Taiwan Defense News Tracker** | [@TaiwansDefense on X](https://x.com/TaiwansDefense) | Real-time security updates from local Taiwanese media[^42] |
| **Taiwan MND Daily Briefings** | [mnd.gov.tw](https://www.mnd.gov.tw) | 6 AM daily PLA incursion reports with flight path maps[^18] |
| **Taiwan Strait Tracker** | [taiwanstraittracker.com](https://taiwanstraittracker.com) | OSINT methodology for tracking Chinese military flights[^18] |
| **NHK World Taiwan** | [nhk.or.jp/nhkworld](https://www3.nhk.or.jp/nhkworld/) | Japanese public broadcaster; strong cross-strait coverage[^43] |

### 🏛️ Research & Think Tanks (Free)

| Source | URL | Notes |
|--------|-----|-------|
| **Taiwan Security Monitor (SCHAR/GMU)** | [tsm.schar.gmu.edu](https://tsm.schar.gmu.edu) | Curated OSINT tools for Taiwan security research[^42] |
| **RCDA (Research on China's Defense Affairs)** | [rcdatw.org](https://rcdatw.org) | Taiwanese researchers on PLA grey-zone tactics[^42] |
| **PLATracker** | [platracker.com](https://www.platracker.com) / [@PLATracker](https://x.com/PLATracker) | PLA capabilities and activity monitoring[^42] |
| **SeaLight (Stanford)** | [sealight.live](https://www.sealight.live) | Maritime grey-zone operations using commercial tech[^42] |
| **ASPI Pressure Points** | [aspi.org.au](https://www.aspi.org.au/report/pressure-points-taiwan-and-the-taiwan-strait/) | Military coercion analysis; Taiwan Strait dynamics[^44] |
| **WarshipCam** | [warshipcam.net](https://www.warshipcam.net) | Global naval vessel sightings; PLAN vessel tracking[^42] |

***

## 4. North Korea / Korean Peninsula

### 📰 Specialist News & Research (Free)

| Source | URL | Notes |
|--------|-----|-------|
| **38 North (Stimson Center)** | [38north.org](https://www.38north.org) | Satellite imagery analysis of DPRK since 2011[^45] |
| **NK News** | [nknews.org](https://nknews.org) | Specialist DPRK news; some articles free |
| **Daily NK** | [dailynk.com](https://www.dailynk.com) | Sources inside North Korea; economic/political monitoring |
| **Radio Free Asia Korea** | [rfa.org/korean](https://www.rfa.org/korean) | First to break internal DPRK developments |
| **North Korean Economy Watch** | [nkeconwatch.com](https://www.nkeconwatch.com) | Specialist blog tracking DPRK economic developments[^46] |
| **Naenara (DPRK Official Portal)** | [naenara.com.kp](http://naenara.com.kp) | Official North Korean government portal; monitor regime messaging[^46] |
| **NKDB Human Rights Database** | [nkdb.org](https://www.nkdb.org) | NGO database of North Korean human rights abuses[^46] |
| **RUSI Project Sandstone** | [rusi.org](https://www.rusi.org) | DPRK illicit weapons and sanctions evasion networks[^46] |
| **Korea Risk Group** | [korearisk.com](https://korearisk.com) | DPRK economic and sanctions intelligence |
| **38 North S&T Journals** | [38north.org/dprk-st-journals](https://www.38north.org) | DPRK scientific and technical journals translated[^46] |

### 🏛️ Think Tanks & Satellite Analysis (Free)

| Source | URL | Notes |
|--------|-----|-------|
| **CSIS Beyond Parallel** | [beyondparallel.csis.org](https://beyondparallel.csis.org) | Declassified satellite imagery of DPRK nuclear/missile sites[^47] |
| **Stimson Center 38 North Satellite Program** | [stimson.org](https://www.stimson.org/project/38-north-satellite-imagery-analysis/) | Monitors WMD, military infrastructure, telecom[^45] |
| **CNS Missile Test Database** | [nti.org/about/programs/cns](https://www.nti.org) | All DPRK missile test records[^46] |
| **SIPRI DPRK Data** | [sipri.org](https://www.sipri.org) | Independent arms, conflict, and disarmament research[^46] |

### 📋 Data Portals (Free)

| Tool | URL | Notes |
|------|-----|-------|
| **DPRK Reports Database (RUSI/NK News)** | [rusi.org](https://www.rusi.org) | Sanctions, entities, relationships linked to DPRK[^46] |
| **DPRK Digital Atlas** | [arcg.is/DPRKAtlas](https://arcg.is/DPRKAtlas) | Geospatial dataset of DPRK political/military infrastructure[^46] |
| **OpenSanctions DPRK** | [opensanctions.org](https://opensanctions.org) | 4,281 sanctioned DPRK entities[^46] |
| **GitHub OSINT-Tools-North-Korea** | [github.com/paulpogoda/OSINT-Tools-North-Korea](https://github.com/paulpogoda/OSINT-Tools-North-Korea) | Curated DPRK OSINT resource list[^48] |
| **UNISHKA DPRK OSINT Toolkit** | [unishka.com](https://unishka.com) | Country-specific toolkit with case studies[^46] |
| **World Bank Data — DPRK** | [data.worldbank.org/country/KP](https://data.worldbank.org/country/KP) | Limited but official economic indicators[^46] |

### 💰 Paid North Korea Tools

| Tool | Price | Notes |
|------|-------|-------|
| **NK Pro** | Subscription (contact) | Leadership tracker, expert directory, full-access reporting[^46] |
| **Maxar SecureWatch** | Enterprise | 30 cm on-demand tasking over DPRK sites[^6] |
| **Jane's / IHS Markit** | Contact sales | DPRK military equipment assessments |

***

## 5. Middle East

*Covers: Saudi Arabia, Iran, Iraq, Syria, Yemen, Israel, Palestine/Gaza, Lebanon, Jordan, UAE, Kuwait, Bahrain, Qatar, Oman, Turkey, Egypt*

### 📰 Regional News (Free)

| Source | URL | Notes |
|--------|-----|-------|
| **Al Jazeera English** | [aljazeera.com](https://www.aljazeera.com) | Qatar-based; strong Arabic-world perspective[^38] |
| **Middle East Eye** | [middleeasteye.net](https://www.middleeasteye.net) | Independent investigative journalism across the region |
| **Haaretz (English)** | [haaretz.com](https://www.haaretz.com) | Israeli independent journalism (limited free) |
| **Iran International** | [iranintl.com](https://www.iranintl.com) | Persian/English; critical of Iranian regime; London-based |
| **The Jerusalem Post** | [jpost.com](https://www.jpost.com) | Israeli English-language newspaper; security focus |
| **Times of Israel** | [timesofisrael.com](https://www.timesofisrael.com) | English; Israeli news and conflict coverage |
| **Al-Monitor** | [al-monitor.com](https://www.al-monitor.com) | Middle East intelligence and analysis |
| **Rudaw** | [rudaw.net](https://www.rudaw.net) | Kurdish-focused; Iraq, Syria, Turkey coverage |
| **Yemen Data Project** | [yemendataproject.org](https://www.yemendataproject.org) | Documents Saudi-led coalition airstrikes in Yemen |
| **Syrian Observatory for Human Rights** | [syriahr.com/en](https://www.syriahr.com/en) | UK-based; real-time Syria conflict reporting |
| **Bellingcat Middle East** | [bellingcat.com](https://www.bellingcat.com) | Investigations; weapons tracking, atrocity documentation |
| **Agence France-Presse (AFP)** | [afp.com](https://www.afp.com) | Wire service with strong Middle East bureau |
| **Middle East Monitor** | [middleeastmonitor.com](https://www.middleeastmonitor.com) | Palestine, Turkey, Egypt-focused coverage |
| **Arab News** | [arabnews.com](https://www.arabnews.com) | Saudi Arabia–based English daily |
| **Al Arabiya English** | [english.alarabiya.net](https://english.alarabiya.net) | UAE-based; Gulf/regional perspective |

### 🏛️ Think Tanks & Analysis (Free)

| Source | URL | Notes |
|--------|-----|-------|
| **Carnegie Middle East Center** | [carnegie-mec.org](https://carnegie-mec.org) | Policy analysis across the Arab world |
| **International Crisis Group — Middle East** | [crisisgroup.org/middle-east-north-africa](https://www.crisisgroup.org/middle-east-north-africa) | Conflict prevention; field-based research |
| **Washington Institute for Near East Policy** | [washingtoninstitute.org](https://www.washingtoninstitute.org) | US policy and regional security |
| **Middle East Institute** | [mei.edu](https://www.mei.edu) | Academic analysis; Iran, Gulf, Israel-Palestine |
| **ACLED Middle East** | [acleddata.com/region/middle-east](https://acleddata.com/region/middle-east) | All conflict events from 2024 to present[^49] |
| **ITIC (Israeli Intelligence & Terrorism Info Center)** | [terrorism-info.org.il/en](https://www.terrorism-info.org.il/en) | Hamas, Hezbollah, Palestinian groups analysis |

### 🔍 Iran-Specific OSINT Tools (Free)

| Tool | Notes |
|------|-------|
| **Parseek + Translation Plugins** | Persian media aggregator; combine with browser translation for full Persian content access[^50] |
| **Iran Monitor** | Real-time OSINT aggregating social media, news agencies, and broadcast sources[^50] |
| **SignalCockpit** | Live situational awareness dashboard with social media integration and event tracking[^50] |
| **CENTCOM US-vs-Iran** | Operational reporting and mapping of US-Iran security environment[^50] |
| **MideastPulse.live** | [mideastpulse.live](https://mideastpulse.live) — AI OSINT dashboard; monitors Telegram; tags/geocodes military strikes in real-time[^51] |

### 🚢 Shipping / Chokepoint Monitoring (Free)

| Tool | Notes |
|------|-------|
| **MarineTraffic** | Strait of Hormuz, Red Sea, Suez Canal vessel tracking (free web; paid API)[^52] |
| **VesselFinder** | Free AIS tracking; good alternative to MarineTraffic for basic use |
| **Global Fishing Watch** | Monitors dark/untracked vessel activity in Gulf waters[^53] |

***

## 6. Ukraine

### 📰 News & Conflict Reporting (Free)

| Source | URL | Notes |
|--------|-----|-------|
| **Kyiv Independent** | [kyivindependent.com](https://kyivindependent.com) | English-language Ukrainian journalism; war reporting |
| **Ukrainska Pravda** | [pravda.com.ua](https://www.pravda.com.ua) | Ukraine's leading investigative outlet (Ukrainian) |
| **The Insider** | [theins.ru](https://theins.ru) | Russian-language investigative; war crimes, Kremlin |
| **Bellingcat** | [bellingcat.com](https://www.bellingcat.com) | Geolocation, weapons tracking, war crimes[^54] |
| **Hromadske International** | [hromadske.ua/en](https://hromadske.ua/en) | Public broadcasting Ukraine; frontline reporting |
| **Radio Free Europe Ukraine** | [rferl.org/ukraine](https://www.rferl.org/ukraine) | Independent; covers censored topics |
| **Ukrinform** | [ukrinform.net](https://www.ukrinform.net) | Ukrainian state newswire; official updates |
| **Reuters Ukraine** | [reuters.com/world/europe/ukraine](https://www.reuters.com/world/europe/ukraine/) | Wire service bureau in Ukraine |

### 🏛️ Think Tanks & Intelligence Analysis (Free)

| Source | URL | Notes |
|--------|-----|-------|
| **ISW (Institute for the Study of War)** | [understandingwar.org](https://understandingwar.org) | Daily campaign assessments since Feb 2022; maps of record[^55][^56] |
| **OSINT For Ukraine** | [osintforukraine.com](https://osintforukraine.com) | War crimes documentation; disinformation combat[^57] |
| **GeoConfirmed** | [geoconfirmed.org](https://geoconfirmed.org) | Volunteer geolocation of Ukraine conflict imagery[^58] |
| **Eyes on Russia (Info-Res)** | [info-res.org/eyes-on-russia](https://www.info-res.org/eyes-on-russia/) | Troop movements, damage documentation, war crimes tracking[^59] |
| **Deep State Map** | [deepstatemap.live](https://deepstatemap.live) | Ukrainian-produced near-real-time frontline map |
| **IntelMapper** | [intelmapper.com](https://intelmapper.com) | AI-mapped OSINT from Telegram; frontline territorial control[^60] |
| **UA Weapons Tracker** | [@UAWeapons on X](https://x.com/UAWeapons) | Documents Russian equipment losses |
| **Oryx (equipment losses)** | [oryxspioenkop.com](https://www.oryxspioenkop.com) | Visually confirmed equipment losses both sides |

### 📡 Telegram Intelligence (Free)

| Tool | Notes |
|------|-------|
| **TGStat** | [tgstat.com](https://tgstat.com) — Telegram channel analytics, search, post archives[^61] |
| **Telemetr.io** | [telemetr.io](https://telemetr.io) — Keyword search across Telegram including deleted content[^62] |
| **Key Channels** | @DeepStateUA (frontline), @UAWeapons (losses), @Militaryosint (general) |

***

## 7. Russia

### 📰 Independent & Monitoring Media (Free)

| Source | URL | Notes |
|--------|-----|-------|
| **Meduza** | [meduza.io](https://meduza.io) | Latvia-based; Russian/English; critical of Kremlin |
| **iStories (Important Stories)** | [istories.media](https://istories.media) | Investigative; oligarchs, corruption, war |
| **Novaya Gazeta Europe** | [novayagazeta.eu](https://novayagazeta.eu) | Exiled Russian investigative outlet |
| **The Bell (Russia)** | [thebell.io/en](https://thebell.io/en) | Russian business and political intelligence |
| **Fontanka** | [fontanka.ru](https://fontanka.ru) | Russian-language; St. Petersburg investigative |
| **OCCRP (Russian investigations)** | [occrp.org](https://www.occrp.org) | Oligarch money flows; sanctions evasion[^38] |
| **RT / TASS / RIA Novosti** | State media | Monitor for official Kremlin narratives (critical reading required) |
| **Moscow Times** | [themoscowtimes.com](https://www.themoscowtimes.com) | English; independent Russia coverage; now exile-based |
| **Bellingcat Russia** | [bellingcat.com](https://www.bellingcat.com) | GRU operations, MH17, assassination investigations[^54] |
| **Verstka Media** | [verstka.media](https://verstka.media) | Russian investigative; war, human rights |
| **iStories / Agency (Russia)** | [iagency.media](https://iagency.media) | Russian investigative journalism collective |

### 🏛️ Think Tanks & Analysis (Free)

| Source | URL | Notes |
|--------|-----|-------|
| **ISW Russia Coverage** | [understandingwar.org/analysis/russia-ukraine](https://understandingwar.org/analysis/russia-ukraine) | Daily force generation and occupied territory analysis[^55] |
| **Chatham House Russia** | [chathamhouse.org/topics/russia-eurasia](https://www.chathamhouse.org) | UK think tank; Russia strategy and policy |
| **CNAS (Center for New American Security)** | [cnas.org](https://www.cnas.org) | US defense strategy including Russia |
| **IISS (Russia coverage)** | [iiss.org](https://www.iiss.org) | Military balance; Russian forces |
| **European Council on Foreign Relations** | [ecfr.eu](https://ecfr.eu) | European perspective on Russia |

### 🗺️ Geospatial & Infrastructure (Free)

| Tool | Notes |
|------|-------|
| **Yandex Maps** | [maps.yandex.com](https://maps.yandex.com) — Best satellite/aerial data available for Russian territory; historical views[^63] |
| **Copernicus Sentinel** | Full coverage; SAR (Sentinel-1) penetrates clouds over Russian-held territory[^64] |
| **NASA FIRMS** | Thermal anomalies — oil field flaring, forest fires, strike impacts[^1] |

### 💰 Paid Russia Tools

| Tool | Price | Notes |
|------|-------|-------|
| **Maxar SecureWatch** | Enterprise | High-resolution tasking for military facility monitoring[^6] |
| **Recorded Future Russia Desk** | $50K–$500K+/year[^37] | Cyber threat intelligence and APT tracking |
| **Babel X** | Contact sales | Russian-language monitoring across social media and dark web[^41] |

***

## 8. Pakistan

### 📰 News & Media (Free)

| Source | URL | Notes |
|--------|-----|-------|
| **Dawn** | [dawn.com](https://www.dawn.com) | Pakistan's leading English-language newspaper |
| **The News International** | [thenews.com.pk](https://www.thenews.com.pk) | Major English-language daily |
| **Geo News** | [geo.tv](https://www.geo.tv) | Largest private TV news; live streaming available |
| **ARY News** | [arynews.tv](https://arynews.tv) | Major Urdu/English news network |
| **Pakistan Today** | [pakistantoday.com.pk](https://www.pakistantoday.com.pk) | Independent English coverage |
| **The Friday Times** | [thefridaytimes.com](https://www.thefridaytimes.com) | Independent; politics, security, civil society |
| **Dawn Urdu** | [dawnnews.tv](https://www.dawnnews.tv) | Urdu-language; reaches wider domestic audience |
| **Radio Free Europe/Asia Pakistan** | [rferl.org/pakistan](https://www.rferl.org/pakistan) | Independent; security and human rights focus |
| **Naya Daur** | [nayadaur.tv](https://nayadaur.tv) | Progressive Pakistani journalism |

### 🏛️ Think Tanks & Security Intelligence (Free)

| Source | URL | Notes |
|--------|-----|-------|
| **PIPS (Pak Institute for Peace Studies)** | [pakpips.com](https://www.pakpips.com) | Monthly Pakistan Security Reports; terrorism database |
| **SATP (South Asia Terrorism Portal)** | [satp.org](https://www.satp.org) | Incident database; provincial breakdowns; terror group profiles |
| **International Crisis Group — Pakistan** | [crisisgroup.org/asia/south-asia/pakistan](https://www.crisisgroup.org/asia/south-asia/pakistan) | Balochistan, TTP, political crises analysis |
| **ACLED Pakistan** | [acleddata.com](https://acleddata.com) | Conflict data; Pakistan increasingly dangerous for civilians per 2025 index[^65] |
| **Stimson Center South Asia** | [stimson.org/programs/south-asia](https://www.stimson.org) | Nuclear weapons and regional security |
| **CSIS India-Pakistan Coverage** | [csis.org](https://www.csis.org) | Indo-Pacific dynamics including Kashmir |
| **Atlantic Council South Asia** | [atlanticcouncil.org](https://www.atlanticcouncil.org) | Pakistan's geopolitical role; US-Pakistan relations |

### 🔐 Cyber & Military Intelligence (Free)

| Tool | Notes |
|------|-------|
| **CloudSEK Pakistan Analysis** | [cloudsek.com](https://www.cloudsek.com) — Tracks APT36 (Transparent Tribe) malware campaigns targeting India from Pakistani infrastructure[^66] |
| **ADS-B Exchange** | Track PAF aircraft activity near Line of Control during tensions[^18] |
| **MarineTraffic** | Karachi port and Arabian Sea vessel monitoring[^52] |

***

## 9. India

### 📰 News & Investigative Media (Free)

| Source | URL | Notes |
|--------|-----|-------|
| **The Hindu** | [thehindu.com](https://www.thehindu.com) | Newspaper of record; national security, foreign policy |
| **Indian Express** | [indianexpress.com](https://www.indianexpress.com) | Independent investigative journalism |
| **The Wire** | [thewire.in](https://thewire.in) | Independent digital news; press freedom, government accountability |
| **The Print** | [theprint.in](https://theprint.in) | National security and defense analysis; Shekhar Gupta's outlet |
| **NDTV** | [ndtv.com](https://www.ndtv.com) | Major English TV news |
| **India Today** | [indiatoday.in](https://www.indiatoday.in) | National magazine and TV; investigative capacity |
| **The Quint** | [thequint.com](https://www.thequint.com) | Digital journalism; fact-checking and accountability |
| **Scroll.in** | [scroll.in](https://scroll.in) | Independent; civil liberties, politics, conflict |
| **The Caravan Magazine** | [caravanmagazine.in](https://caravanmagazine.in) | Long-form investigative journalism |
| **ANI / PTI** | Wire services | Breaking news; government announcements |
| **Manorama Online** | [onmanorama.com](https://www.onmanorama.com) | Kerala-based; South India and national |

### 🏛️ Think Tanks & Strategic Research (Free)

| Source | URL | Notes |
|--------|-----|-------|
| **IDSA (Institute for Defence Studies)** | [idsa.in](https://www.idsa.in) | Government-adjacent; open strategic assessments |
| **ORF (Observer Research Foundation)** | [orfonline.org](https://www.orfonline.org) | Foreign policy and security analysis; free publications |
| **Takshashila Institution** | [takshashila.org.in](https://takshashila.org.in) | Indian strategic affairs; technology policy |
| **CLAWS (Centre for Land Warfare Studies)** | [claws.in](https://www.claws.in) | Indian Army–adjacent; border security analysis |
| **Vivekananda International Foundation** | [vifindia.org](https://www.vifindia.org) | Security, intelligence, and strategic policy |
| **SATP India** | [satp.org/country/india](https://www.satp.org/country/india) | Incident database; J&K, Northeast India, Maoist zones |
| **ACLED India** | [acleddata.com](https://acleddata.com) | Political violence and protest data[^67] |

### 🔐 Cyber Intelligence (Free)

| Tool | Notes |
|------|-------|
| **CloudSEK** | [cloudsek.com](https://www.cloudsek.com) — Tracks Pakistan-linked hacktivist groups; published detailed May 2025 hacktivist surge analysis[^66] |
| **CERT-In** | [cert-in.org.in](https://www.cert-in.org.in) — India's Computer Emergency Response Team; official security advisories |
| **Shodan** | Monitor Indian internet-facing infrastructure; search `country:IN`[^36] |

### 📡 Geospatial & Border Monitoring (Free)

| Tool | Notes |
|------|-------|
| **Copernicus Sentinel** | LAC (Line of Actual Control) infrastructure monitoring; SAR for cloud cover penetration[^64] |
| **NASA FIRMS** | Agricultural stubble burning; industrial thermal monitoring in Punjab/Haryana[^1] |
| **ADS-B Exchange** | IAF aircraft activity tracking near borders[^18] |

***

## 10. African Continent

### 📰 Pan-African News (Free)

| Source | URL | Notes |
|--------|-----|-------|
| **BBC Africa Eye** | [bbc.com/news/africa](https://www.bbc.com/news/africa) | Forensic OSINT investigations; landmark Cameroon, Ethiopia, Sudan work[^68][^69] |
| **AllAfrica** | [allafrica.com](https://www.allafrica.com) | Aggregates 130+ African news organizations |
| **The Africa Report** | [theafricareport.com](https://www.theafricareport.com) | Pan-African political and economic news |
| **Radio France Internationale (RFI)** | [rfi.fr](https://www.rfi.fr) | French/English/Portuguese/Swahili; extensive African bureau |
| **Al Jazeera Africa** | [aljazeera.com/africa](https://www.aljazeera.com/africa) | Strong sub-Saharan coverage |
| **Africa Confidential** | [africa-confidential.com](https://www.africa-confidential.com) | Subscription newsletter; covert affairs (first 2 articles free) |
| **Mail & Guardian (South Africa)** | [mg.co.za](https://mg.co.za) | South Africa's premier investigative weekly |
| **Daily Maverick** | [dailymaverick.co.za](https://www.dailymaverick.co.za) | South African investigative; Scorpio unit |
| **The Continent** | [thecontinent.org](https://thecontinent.org) | Pan-African weekly; free WhatsApp/PDF distribution |
| **Africa Is a Country** | [africasacountry.com](https://africasacountry.com) | Critical commentary on African politics and society |
| **Sudan War Monitor** | [sudanwarmonitor.com](https://sudanwarmonitor.com) | Dedicated tracking of SAF vs. RSF conflict post-2023 |
| **Sahel Watch** | Active X/Telegram accounts tracking Sahel security events |

### 🏛️ Think Tanks & Conflict Research (Free)

| Source | URL | Notes |
|--------|-----|-------|
| **ACLED Africa** | [acleddata.com/region/africa](https://acleddata.com/region/africa) | Highest-quality conflict data; covers all 54 nations[^70][^71] |
| **ACCORD (African Centre for Conflict Resolution)** | [accord.org.za](https://www.accord.org.za/conflict-resilience-monitor/) | Monthly conflict analysis[^72] |
| **Congo Research Group** | [congoresearchgroup.org](https://congoresearchgroup.org) | NYU-based; DRC militia networks, UN peacekeeping |
| **Crisis Group Africa** | [crisisgroup.org/africa](https://www.crisisgroup.org/africa) | Field-based conflict prevention research |
| **Institute for Security Studies (ISS Africa)** | [issafrica.org](https://issafrica.org) | Pretoria-based; peace and security across Africa |
| **OCHA ReliefWeb** | [reliefweb.int](https://reliefweb.int) | UN humanitarian situation reports for all African crises |
| **CMT (Conflict Monitoring Tool)** | [crtp.hekima.ac.ke](https://crtp.hekima.ac.ke) | DRC, Ethiopia, South Sudan, Sudan annual updates[^71][^73] |
| **Africa Center for Strategic Studies** | [africacenter.org](https://africacenter.org) | US DoD–affiliated; security dynamics and governance |
| **Human Rights Watch Africa** | [hrw.org/africa](https://www.hrw.org/africa) | Satellite-confirmed atrocity documentation |
| **Amnesty International Africa** | [amnesty.org/en/location/africa](https://www.amnesty.org/en/location/africa) | Commercial imagery used to document violations |

### 🔍 Africa-Specific OSINT Resources (Free)

| Tool | URL | Notes |
|------|-----|-------|
| **BBC Africa Eye Forensics Dashboard** | Linked from bellingcat.com/toolkit | OSINT toolkit developed for African investigations[^68] |
| **DigitalDigging Africa OSINT** | [digitaldigging.org/osint](https://digitaldigging.org/osint) | Country-specific OSINT pages[^74] |
| **CyberInt Africa OSINT** | [cyberint.uk/osint_tools/africa](https://cyberint.uk/osint_tools/africa) | Country-specific OSINT tools for African nations[^75] |
| **LiveUAMap Africa** | [liveuamap.com](https://liveuamap.com) | Covers Mozambique, Sudan, Sahel events[^76] |

### 📡 Satellite & Environmental Monitoring (Free)

| Tool | Notes |
|------|-------|
| **NASA FIRMS Africa** | Deforestation, agricultural fires, armed conflict thermal signatures[^1] |
| **Copernicus Sentinel (Africa)** | Free SAR + multispectral; humanitarian disaster mapping[^64] |
| **Global Fishing Watch — West Africa** | Monitors illegal fishing in West African EEZs; tracks foreign fishing fleets[^53] |
| **UNOSAT** | [unosat.org](https://unosat.org) — UN Satellite Centre; free damage assessment maps for African conflicts |
| **MODIS/NDVI Vegetation Watch** | Tracks vegetation health; food security and drought monitoring |

***

## API Quick Reference

| Tool | API URL | Cost | Auth Method |
|------|---------|------|-------------|
| NASA FIRMS | https://firms.modaps.eosdis.nasa.gov/api/ | Free | MAP_KEY (free registration)[^77] |
| Copernicus / Sentinel Hub | https://documentation.dataspace.copernicus.eu/APIs.html | Free (CDSE quota) | OAuth2 client credentials[^78][^3] |
| ACLED | https://acleddata.com/api/ | Free | Bearer token (free registration)[^26] |
| OpenSky Network | https://openskynetwork.github.io/opensky-api/ | Free (non-commercial) | Optional HTTP Basic Auth[^14] |
| Global Fishing Watch | https://globalfishingwatch.org/our-apis/ | Free (non-commercial) | API key (request by email)[^23] |
| Overpass API (OSM) | https://overpass-api.de/api/interpreter | Free | None |
| Shodan | https://developer.shodan.io/api | $49 lifetime / $69+/mo[^27] | API key |
| ADS-B Exchange (adsb.lol) | https://api.adsb.lol | Free (feeder key future) | None currently[^16] |
| Flightradar24 | https://fr24api.flightradar24.com | $9–$900/mo[^19] | Bearer token |
| MarineTraffic | https://servicedocs.marinetraffic.com | Enterprise subscription[^20] | API key |
| Planet Labs | https://docs.planet.com | $9,650+/yr or free (E&R)[^8][^9] | API key |
| Congress.gov | https://api.congress.gov | Free | API key (free) |
| FEC | https://api.open.fec.gov | Free | API key (free) |
| USASpending | https://api.usaspending.gov | Free | None |
| OpenSanctions | https://opensanctions.org/api/ | Free bulk download; €200+/mo API[^38] | API key |

***

## Paid Platform Pricing Summary

| Platform | Price | Notes |
|----------|-------|-------|
| **Recorded Future** | $50K–$500K+/year[^37] | Enterprise threat intelligence |
| **Maxar SecureWatch** | Enterprise (contact sales) | 30 cm imagery; OGC API included[^6] |
| **Planet Labs** | $9,650/year (Global)[^8] | Free tier for academics: 3,000 km²/mo[^9] |
| **Airbus Pléiades** | From €3.80/km² archive; ~€18/km² tasking[^11] | |
| **Flightradar24 API** | $9/$99/$900/month[^19] | Explorer/Essential/Advanced |
| **ADS-B Exchange API** | ~$10/month via RapidAPI[^17] | 10,000 requests |
| **MarineTraffic API** | Enterprise (contact sales)[^20] | Was credit-based; now subscription only |
| **Shodan** | $49 lifetime / $69–$1,099/month[^27] | Freelancer to Corporate |
| **Maltego Professional** | ~€6,600/year[^30] | Full OSINT + link analysis |
| **Maltego Basic (CE)** | Free[^31] | 200 credits/month |
| **Babel X** | ~$50K+/year (estimated) | Multilingual SOCMINT |
| **Bloomberg Terminal** | ~$2,000/month | Financial intelligence |
| **NK Pro** | Contact sales | DPRK specialist intelligence[^46] |
| **Africa Confidential** | Subscription (contact) | African political intelligence newsletter |

***

## Operational Notes

Multiple independent lines of evidence must converge before drawing high-confidence conclusions from OSINT — a single satellite image, social media post, or report is insufficient for attribution or assessment. Russia and China actively monitor foreign OSINT practitioners; use operational security (VPNs, separate accounts, compartmentalization) when investigating these targets. Telegram's suspension of established OSINT channels in June 2025 highlights the fragility of single-platform intelligence workflows — always archive and cross-reference.[^79][^80]

For your network engineering background, the Shodan and Censys APIs provide direct value for infrastructure reconnaissance; both have Python libraries suitable for automation. The OpenSky + FIRMS + ACLED trio covers the core geopolitical monitoring stack with entirely free, programmatic access — all three integrate cleanly into a Python/Grafana dashboard pipeline.[^26][^1][^14]

---

## References

1. [NASA | LANCE | FIRMS](https://firms.modaps.eosdis.nasa.gov) - NASA FIRMS uses satellite observations from the MODIS and VIIRS instruments to detect active fires a...

2. [Fire Information for Resource Management System (FIRMS)](http://toolkit.climate.gov/tool/fire-information-resource-management-system-firms) - This system distributes active fire data derived from instruments on satellites. For the US and Cana...

3. [Help downloading sentinel 2 imagery using Python or R?](https://www.reddit.com/r/remotesensing/comments/1md4xti/help_downloading_sentinel_2_imagery_using_python/) - Hi!

I want to programmatically retrieve Sentinel 2 imagery using either Python or R for a personal ...

4. [Top 10 Free Sources of Satellite Data](https://skywatch.com/free-sources-of-satellite-data/) - EXPLORE aggregates satellite imagery and other remote sensing data from multiple providers, includin...

5. [Sentinel-2 cloudless map of the world by EOX](https://s2maps.eu) - You are free to use Sentinel-2 cloudless as long as you follow the applicable license conditions. Th...

6. [Maxar SecureWatch – Update on the Middle East](https://apollomapping.com/blog/maxar-securewatch-update-on-the-middle-east) - For more information on the pricing and coverage available in Maxar's SecureWatch, you can reach our...

7. [SECUREWATCH](https://people.duke.edu/~ng46/El-Ali/MAXAR%20SW%20DS.pdf) - Maxar satellite imagery is available to view or download in SecureWatch within 48 hours ... » Availa...

8. [Flexible Pricing for Satellite Imagery & Data](https://www.planet.com/pricing/) - Discover Planet's transparent and scalable pricing for high-resolution satellite imagery, analytics,...

9. [Planet Labs | Yale Center for Geospatial Solutions](https://geospatial.yale.edu/planet-labs) - This guide outlines how Yale affiliates can request access to Planet Labs satellite imagery. Last up...

10. [Education & Research | Planet Community](https://community.planet.com/education-research-84) - This is a space for the E&R Program, Planet provides university access to PlanetScope and RapidEye i...

11. [Demystifying satellite data pricing: A comprehensive guide](https://geoawesome.com/demystifying-satellite-data-pricing-a-comprehensive-guide/) - Maxar SecureWatch: On-demand access to frequently updated, high-resolution satellite imagery, plus a...

12. [The 9 top satellite imagery companies](https://felt.com/blog/top-satellite-imagery-companies) - Planet Labs runs a vast fleet of small commercial satellites in orbit, capturing daily images of Ear...

13. [Satellite Imagery, SAR & Analytics | Earth Intelligence by SkyFi](https://skyfi.com) - SkyFi's open data program provides comprehensive, free satellite data to broaden analytics use cases...

14. [The OpenSky Network API documentation](https://openskynetwork.github.io/opensky-api/) - This is the official documentation of the OpenSky Network's live API. The API lets you retrieve live...

15. [OpenSky Trino Historical Database](https://opensky-network.org/data/trino) - Explore the documentation of our Trino interface by visiting the OpenSky Trino Docs. OpenSky Logo. H...

16. [adsb.lol API](https://api.adsb.lol) - You can use the API for free. In the future, you will require an API key which you can get by feedin...

17. [ADS-B Exchange - LiveTraffic - GitBook](https://twinfan.gitbook.io/livetraffic/setup/installation/ads-b-exchange) - ADS-B Exchange offers data access through RAPID API . At the time of ... Registration by itself is f...

18. [How to Track Chinese Military Flights: Beginner's OSINT Guide](https://taiwanstraittracker.com/articles/tracking-military-flights.html) - You do not need a classified security clearance to monitor the People's Liberation Army. You just ne...

19. [How to Integrate FlightRadar24 API in Your Travel Platform?](https://www.gurutechnolabs.com/blog/how-to-integrate-flightradar24-api/) - What is the FlightRadar24 API Pricing? ; Essential, $99, 450,000, Expanded endpoints, airline/airpor...

20. [MarineTraffic API Pricing vs Alternatives | AIS ...](https://datadocked.com/ais-api-providers) - Jan 2025Pricing Change. MarineTraffic Removes Credit System. MarineTraffic discontinues credit-based...

21. [How Much Does MarineTraffic Cost (2025)—and What Are ...](https://blogs.tradlinx.com/how-much-does-marinetraffic-cost-2025-and-what-are-you-really-getting/) - MarineTraffic Pricing Overview (2025) ; Nautical Charts (App), $6.99, $66.99 ; Weather Maps (App), $...

22. [How do I get access to Global Fishing Watch APIs?](https://globalfishingwatch.org/faqs/most-of-our-apis-are-available-to-anyone-to-use-for-non-commercial/) - How do I get access to Global Fishing Watch APIs?

23. [Our Apis - Explore and visualize ocean data](https://globalfishingwatch.org/our-apis/) - Explore, visualize and freely download Global Fishing Watch data and synthesize multiple streams of ...

24. [Python Package Release](https://globalfishingwatch.org/platform-update/2025-april-python-package-release-a-new-way-to-work-with-gfw-apis/) - A new Python package is now available for interacting with Global Fishing Watch APIs, allowing acces...

25. [Frequently Asked Questions about myACLED](https://acleddata.com/myacled-faqs) - myACLED is our new data and platform access system. It is replacing Access Keys. You will only need ...

26. [API documentation](https://acleddata.com/acled-api-documentation) - In this guide you can learn the basics of using the ACLED API to access ACLED data. Elements of ACLE...

27. [Shodan Pricing 2026](https://www.trustradius.com/products/shodan/pricing) - Shodan has 3 pricing plans(s), starting at $69. Plans Freelancer $69 per month Cloud Small Business ...

28. [Academic Upgrade](https://help.shodan.io/the-basics/academic-upgrade) - Shodan provides a free Membership upgrade for users that sign up with an academic email address (ex....

29. [Maltego Pricing](https://www.maltego.com/pricing/) - Explore plans that power all digital investigations ; Basic · Forever free for. Maltego explorers. P...

30. [Maltego Software Pricing, Alternatives & More 2026](https://www.capterra.com/p/266210/Maltego/) - Maltego Professional Plan. $6,600. Other,Per Year ; Pros. Ability for the software to find possible ...

31. [Beginners' Guide | Setting up Maltego Graph Community ...](https://www.maltego.com/blog/beginners-guide-to-maltego-setting-up-maltego-community-edition-ce/) - CE is available through the Basic plan, Maltego's free tier, which includes 200 monthly Credits to e...

32. [Is there a commercial Overpass Api service?](https://www.reddit.com/r/openstreetmap/comments/b1judk/is_there_a_commercial_overpass_api_service/) - I undestand Overpass has api limits, I want to use Overpass data in a commercial product (specifical...

33. [SIPRI Military Expenditure Database](https://www.sipri.org/databases/milex) - The SIPRI Military Expenditure Database contains consistent time series on the military spending of ...

34. [ProPublica — Investigative Journalism and News in the Public ...](https://www.propublica.org) - ProPublica is a nonprofit, investigative newsroom that exposes corruption. We report in all 50 state...

35. [How to use court records and legal documents for OSINT](https://www.authentic8.com/blog/court-records-legal-documents-osint-investigations) - PACER (Public Access to Court Electronic Records) - provides online access to over a billion documen...

36. [Essential OSINT Tools for GEOINT Professionals](https://geointai.substack.com/p/essential-osint-tools-for-geoint) - Google Earth Engine – Provides satellite imagery and geospatial analysis for tracking environmental ...

37. [Recorded Future Pricing 2026: Plans, Costs & TCO](https://checkthat.ai/brands/recorded-future/pricing) - Recorded Future pricing details: Core to Elite tiers, custom quotes, $50K-$500K+ annual cost. Compar...

38. [Using OSINT in geopolitical assessment: a practical guide](https://www.authentic8.com/blog/osint-geopolitical-assessment) - Analysts use tools like Google Trends, Social Searcher, UN Comtrade, and MarineTraffic to monitor po...

39. [Military](https://www.heritage.org/china-transparency-project/military) - The SIPRI Arms Industry Database contains information on arms-producing and military services compan...

40. [Using OSINT to Analyse China's Two Sessions](https://www.osintcombine.com/post/using-osint-to-analyse-china-s-two-sessions) - Discover how OSINT techniques can help analyse China's Two Sessions, revealing Beijing's priorities ...

41. [Understanding OSINT in 2025: Tools & Techniques Every ...](https://www.linkedin.com/pulse/understanding-osint-2025-tools-techniques-every-analyst-okorobie-1xkff) - Tools like Maltego and Babel X allow analysts to visualize relationships, track threat actors, and m...

42. [OSINT Tools and Trackers - Taiwan Security Monitor](https://tsm.schar.gmu.edu/resources/osint-tools-and-trackers/) - From satellite imagery analysis to social media monitoring, these tools enhance transparency and ena...

43. [Young Taiwanese track China's military using open-source ...](https://www3.nhk.or.jp/nhkworld/en/news/backstories/4745/) - A young Taiwanese using open-source intelligence is tracking Beijing's movement online and mapping m...

44. [Pressure points: Taiwan and the Taiwan Strait](https://www.aspi.org.au/report/pressure-points-taiwan-and-the-taiwan-strait/) - Pressure Points part 2 explores Beijing's growing use of military coercion against Taiwan, detailing...

45. [38 North Satellite Imagery Analysis](https://www.stimson.org/project/38-north-satellite-imagery-analysis/) - 38 North has been engaged in this monitoring effort since 2011 and provides key insights into how th...

46. [OSINT of North Korea - by UNISHKA Research Service](https://unishka.substack.com/p/osint-of-north-korea) - We regularly share country-specific OSINT toolkits, along with case studies, investigative tips, and...

47. [A new Beyond Parallel analysis reveals declassified ...](https://www.facebook.com/CSIS.org/posts/a-new-beyond-parallel-analysis-reveals-declassified-satellite-imagery-of-north-k/1095259262646183/) - A new Beyond Parallel analysis reveals declassified satellite imagery of North Korea's Yongdok-tong ...

48. [OSINT-Tools-North-Korea/README.md at main](https://github.com/paulpogoda/OSINT-Tools-North-Korea/blob/main/README.md) - A list of OSINT resources and tools that may be useful to you when conducting investigations related...

49. [Middle East](https://acleddata.com/region/middle-east) - This interactive map includes all ACLED data covering the Middle East from 1 January 2024 to present...

50. [4 OSINT Tools for Monitoring Iran and the Middle East](https://www.specialeurasia.com/2026/03/03/4-osint-tools-middle-east-iran/) - 4 OSINT Tools for Monitoring Iran and the Middle East · 1. Parseek with Translation Plugins. · 2. Ir...

51. [I built a real-time conflict intelligence dashboard that ...](https://www.reddit.com/r/osinttools/comments/1rmg8sn/i_built_a_realtime_conflict_intelligence/) - It listens to dozens of Telegram OSINT channels in real time, runs each event through an AI classifi...

52. [OSINT TOOLKIT: MARINETRAFFIC, A REAL-TIME VESSEL ...](https://www.counterterrorismgroup.com/post/osint-toolkit-marinetraffic-a-real-time-vessel-tracking-tool-that-enhances-maritime-security-and-v) - MarineTraffic is a free OSINT tool that provides real-time maritime traffic details including routes...

53. [Mapping Human Activity at Sea](https://globalfishingwatch.org/our-map/) - The Global Fishing Watch map is the first open-access online platform for visualization and analysis...

54. [Full article: The War on Open-Source Intelligence](https://www.tandfonline.com/doi/full/10.1080/0163660X.2025.2554477) - OSINT has enabled a constellation of actors to expose military aggression, war crimes, human rights ...

55. [Russian Offensive Campaign Update | Product Line | ISW](https://understandingwar.org/analysis/russia-ukraine/russian-offensive-campaign-assessment/) - In April 2024, ISW launched two new product lines to explore these Russian activities in occupied Uk...

56. [Russia & Ukraine Coverage](https://understandingwar.org/analysis/russia-ukraine/) - The Russia and Ukraine team publishes the world-famous analysis of record assessing Russia's full-sc...

57. [OSINT For Ukraine](https://osintforukraine.com) - OSINT for Ukraine harnesses open-source intelligence (OSINT) to uncover international crimes, combat...

58. [GeoConfirmed — Open-Source Conflict Geolocation ...](https://geoconfirmed.org) - GeoConfirmed is a volunteer-driven OSINT project that geolocates and verifies visual content from co...

59. [How OSINT shaped reporting on the war in Ukraine](https://www.info-res.org/eyes-on-russia/articles/how-osint-shaped-reporting-on-the-war-in-ukraine/) - The Eyes on Russia project has worked to track troop movements, document damage and civilian harm, a...

60. [[OC] Real-time interactive conflict map tracking geolocated ...](https://www.reddit.com/r/dataisbeautiful/comments/1rlsh0k/oc_realtime_interactive_conflict_map_tracking/) - It monitors OSINT sources 24/7, uses AI to geolocate and verify reports, and displays them on an int...

61. [Monitoring tools for OSINT](https://www.youtube.com/watch?v=posA4P1i5gI) - Talkwalker is a social media analytics tool that helps track data from over 150 million sources. The...

62. [OSINT & Telegram: How to Unmask Identities and Extract ...](https://nationaldefenselab.com/news/details/osint-telegram-user-tracking) - Learn how Open-Source Intelligence (OSINT) techniques can uncover Telegram user identities, track ac...

63. [Satellite Imagery - Bellingcat's Online Investigation Toolkit](https://bellingcat.gitbook.io/toolkit/categories/maps-and-satellites/satellite-imagery) - A free web-based platform for viewing, analyzing, and downloading satellite imagery from the Europea...

64. [Copernicus Data Space Ecosystem | Europe's eyes on Earth](https://dataspace.copernicus.eu) - An open ecosystem that provides free instant access to a wide range of data and services from the Co...

65. [Conflict Index](https://acleddata.com/series/acled-conflict-index) - ACLED records high levels of violence in nearly 70% of Gaza and the West Bank. ACLED records 204,605...

66. [The Tactical Reality Behind the India-Pakistan Hacktivist ...](https://www.cloudsek.com/blog/brief-disruptions-bold-claims-the-tactical-reality-behind-the-india-pakistan-hacktivist-surge) - In May 2025, multiple Pakistan-linked hacktivist groups claimed over 100 cyberattacks on Indian gove...

67. [ACLED data](https://acleddata.com) - ACLED is an independent, impartial conflict monitor providing real-time data and analysis on violent...

68. [Fundamentals of Open-Source Intelligence for Journalists](https://www.icfj.org/news/fundamentals-open-source-intelligence-journalists) - OSINT resources. Macguire offered several tools and resources for journalists interested in OSINT. H...

69. [Benjamin Strick: How to Get Into Open Source Investigations?](https://bird.tools/how_to/benjamin-strick-how-to-get-into-open-source-investigations/) - Benjamin Strick, an open source investigator for BBC Africa Eye and Bellingcat speaks about first st...

70. [Africa](https://acleddata.com/region/africa) - Middle East US and Canada Conflict data. ACLED's latest data and analysis on countries in Africa. Co...

71. [(PDF) Conflict Monitoring in Africa for strategic intervention](https://www.academia.edu/100846494/Conflict_Monitoring_in_Africa_for_strategic_intervention) - The 2022 Conflict Monitoring Tool (CMT) updates conflict situations in DRC, Ethiopia, South Sudan, a...

72. [Conflict & Resilience Monitor - ACCORD](https://www.accord.org.za/conflict-resilience-monitor/) - The Conflict and Resilience Monitor offers monthly blog-size commentary and analysis on the latest c...

73. [2025: CONFLICT MONITORING TOOL (CMT ) PUBLICATION](https://crtp.hekima.ac.ke/2025-conflict-monitoring-tool-cmt-publication/) - ... Sudan and the Democratic Republic of Congo (DRC), with the 2025 situation confirming the emergen...

74. [OSINT Resources/Tools by Country V 2.0](https://digitaldigging.org/osint/) - This page by Henk van Ess lists tools and websites for Open Source Intelligence (OSINT) - gathering ...

75. [OSINT Tools for African Countries](https://cyberint.uk/osint_tools/africa/) - This page provides a list of OSINT tools and resources specific to African countries. These tools ai...

76. [Live Universal Awareness Map](https://acleddata.com/research-local-data-collection-partner/live-universal-awareness-map) - Ukraine Conflict Monitor · Gaza Conflict Monitor · Iran War Updates · Middle East Conflict Monitor ·...

77. [How to use FIRMS API in Python](https://firms.modaps.eosdis.nasa.gov/content/academy/data_api/firms_api_use.html) - In this tutorial we will look into using FIRMS API to access up-to-date fire detections. To view cur...

78. [APIs - Documentation - Copernicus](https://documentation.dataspace.copernicus.eu/APIs.html) - The Streamlined Data Access APIs (SDA) provide the most intuitive option to access and retrieve Eart...

79. [Open-source Intelligence and North Korea: An Interview ...](https://www.38north.org/2024/12/open-source-intelligence-and-north-korea-an-interview-with-uk-air-vice-marshal-ret-sean-corbett/) - Open-source intelligence (OSINT) for some time has been a widely used term among North Korea watcher...

80. [Telegram OSINT Channels and WhatsApp Disruptions in ...](https://www.specialeurasia.com/2025/07/01/telegram-whatsapp-osint-russia/) - On Friday, June 27, 2025, Telegram blocked multiple OSINT-focused channels, active for several years...

