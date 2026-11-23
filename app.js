/* ============================================================
   RedList Rescue — urgent (red-listed) shelter animal listings
   "Like Petfinder, but only red-listed animals" — searchable by ZIP.

   LIVE DATA: RescueGroups.org is wired as the FIRST live source —
   fetchRescueGroups() below queries its v5 API by ZIP + radius as
   soon as an API key is pasted into API_CONFIG (until then it no-ops
   and the prototype runs on the sample listings). The per-platform
   adapters further down remain stubs; see DATA-SOURCES.md for why
   RescueGroups replaced Petfinder as the first source.
   ============================================================ */

// Working app name — rename in one place (also the <title> in index.html).
const APP_NAME = "RedList Rescue";

// --- Live-data configuration ---
const API_CONFIG = {
  // FIRST LIVE SOURCE — RescueGroups.org API v5 (see DATA-SOURCES.md).
  // Free nonprofit API; the key comes from a request form at
  // https://rescuegroups.org/services/adoptable-pet-data-api/ — paste it
  // here when it arrives. While this is "", fetchRescueGroups() returns
  // [] and the app runs on the sample listings, like the stubs below.
  rescueGroupsBaseUrl: "https://api.rescuegroups.org/v5",
  rescueGroupsApiKey: "", // TODO: paste RescueGroups.org API key when it arrives
  // Petfinder: REMOVED as a data source — Petfinder decommissioned its
  // API on Dec 2, 2025 (see DATA-SOURCES.md), so there are deliberately
  // no Petfinder key/secret placeholders here anymore. Do not re-add.
  // Shelter urgent-list feeds (future): per-shelter RSS/JSON endpoints can be
  // listed here and merged into loadListings() alongside RescueGroups results.
  urgentFeeds: [
    // { name: "Example Shelter urgent list", url: "" },
  ],
};

/* ------------------------------------------------------------
   DONATIONS — wired for Stripe Payment Links, the same way
   FarmLedger takes payments: create a Payment Link in Stripe and
   paste it here. While a link is "" the matching Donate button
   shows an honest disabled "Donations open at launch" state; once
   filled in, the button becomes a normal link to Stripe (the
   chosen preset amount is shown on the button — if per-amount
   links are ever needed, this becomes a per-amount map).
   No card details are ever collected here and the prototype makes
   no network calls.
   ------------------------------------------------------------ */
const DONATE_LINKS = {
  siteLink: "", // TODO: Stripe Payment Link for "keep RedList Rescue running"
  tnrLink: "",  // TODO: Stripe Payment Link for local TNR donations
};

// Sami hasn't named the local TNR program yet — placeholder until launch.
const TNR_RECIPIENT = "a local TNR program — recipient to be named at launch";

/* ------------------------------------------------------------
   ZIP centroid table (approx. lat/lon per ZIP) — covers every sample
   shelter ZIP plus ~40 common US ZIPs. ZIPs not in the table fall back
   to grouping-only mode (no distances, no radius filtering).
   ------------------------------------------------------------ */
const ZIP_CENTROIDS = {
  // Sample shelter ZIPs
  "55901": [44.0121, -92.4802], // Rochester, MN
  "55401": [44.9837, -93.2694], // Minneapolis, MN
  "55101": [44.9504, -93.0899], // St. Paul, MN
  "56301": [45.5607, -94.1614], // St. Cloud, MN
  "77002": [29.7558, -95.3620], // Houston, TX
  "75201": [32.7877, -96.7989], // Dallas, TX
  "76102": [32.7535, -97.3315], // Fort Worth, TX
  "90012": [34.0614, -118.2385], // Los Angeles, CA
  "92401": [34.1058, -117.2941], // San Bernardino, CA
  "95814": [38.5825, -121.4898], // Sacramento, CA
  "60601": [41.8864, -87.6186], // Chicago, IL
  "85003": [33.4486, -112.0773], // Phoenix, AZ
  "30303": [33.7525, -84.3915], // Atlanta, GA
  // Common US ZIPs
  "10001": [40.7506, -73.9972], // New York, NY
  "02108": [42.3577, -71.0636], // Boston, MA
  "19103": [39.9517, -75.1678], // Philadelphia, PA
  "20001": [38.9101, -77.0171], // Washington, DC
  "23219": [37.5415, -77.4408], // Richmond, VA
  "28202": [35.2285, -80.8410], // Charlotte, NC
  "32202": [30.3298, -81.6590], // Jacksonville, FL
  "33101": [25.7751, -80.1947], // Miami, FL
  "37203": [36.1550, -86.7852], // Nashville, TN
  "40202": [38.2542, -85.7515], // Louisville, KY
  "43215": [39.9655, -83.0007], // Columbus, OH
  "45202": [39.1031, -84.5120], // Cincinnati, OH
  "46204": [39.7679, -86.1566], // Indianapolis, IN
  "48226": [42.3299, -83.0487], // Detroit, MI
  "53203": [43.0339, -87.9096], // Milwaukee, WI
  "55404": [44.9620, -93.2730], // Minneapolis, MN
  "55902": [43.9989, -92.4656], // Rochester, MN
  "57103": [43.5453, -96.7283], // Sioux Falls, SD
  "58102": [46.8772, -96.7898], // Fargo, ND
  "63103": [38.6300, -90.2075], // St. Louis, MO
  "64106": [39.1034, -94.5725], // Kansas City, MO
  "68102": [41.2585, -95.9310], // Omaha, NE
  "67202": [37.6895, -97.3350], // Wichita, KS
  "73102": [35.4685, -97.5125], // Oklahoma City, OK
  "72201": [34.7478, -92.2880], // Little Rock, AR
  "70112": [29.9610, -90.0700], // New Orleans, LA
  "78205": [29.4246, -98.4932], // San Antonio, TX
  "78701": [30.2711, -97.7437], // Austin, TX
  "80202": [39.7525, -104.9995], // Denver, CO
  "84101": [40.7669, -111.8910], // Salt Lake City, UT
  "85004": [33.4495, -112.0730], // Phoenix, AZ
  "85701": [32.2230, -110.9670], // Tucson, AZ
  "87102": [35.0867, -106.6496], // Albuquerque, NM
  "89101": [36.1676, -115.1484], // Las Vegas, NV
  "92101": [32.7174, -117.1628], // San Diego, CA
  "94103": [37.7726, -122.4099], // San Francisco, CA
  "94607": [37.7972, -122.2907], // Oakland, CA
  "97205": [45.5207, -122.6862], // Portland, OR
  "98101": [47.6107, -122.3344], // Seattle, WA
  "99201": [47.6590, -117.4250], // Spokane, WA
  "83702": [43.6197, -116.2092], // Boise, ID
  "99501": [61.2174, -149.8629], // Anchorage, AK
  "96813": [21.3089, -157.8583], // Honolulu, HI
};

/* ------------------------------------------------------------
   SAMPLE LISTINGS — demo data in the exact shape a future API
   response will use. Fields:
     id, name, species ("dog" | "cat" | "other"), breed, sex,
     ageGroup ("Puppy/Kitten" | "Young" | "Adult" | "Senior"),
     shelter, city, state, zip,
     deadlineISO (or null), daysLeft (fallback if no deadlineISO, or null),
     sourceUrl, photoEmoji, tile (photo tile background color), notes
   Optional fields: source (who submitted it — community / shelter),
     photo (data-URL string when a real photo was uploaded, else null),
     shelterId (owning partner shelter, for dashboard-managed animals),
     adopted (true once marked adopted/rescued — hidden from public lists)
   ------------------------------------------------------------ */
const LISTINGS = [
  {
    id: "mn-001", name: "Buddy", species: "dog", breed: "Labrador Retriever mix",
    sex: "Male", ageGroup: "Adult", shelter: "Paws & Claws Humane Society",
    city: "Rochester", state: "MN", zip: "55901",
    deadlineISO: "2026-11-23", daysLeft: null,
    sourceUrl: "#", photoEmoji: "🐶", tile: "#ffe3b3",
    notes: "Buddy is a gentle, people-loving lab who was surrendered when his owner moved. He knows sit and shake, walks beautifully on a leash, and is running out of time purely because the shelter is full. Great with kids and other dogs.",
  },
  {
    id: "mn-002", name: "Mittens", species: "cat", breed: "Domestic Shorthair",
    sex: "Female", ageGroup: "Senior", shelter: "Paws & Claws Humane Society",
    city: "Rochester", state: "MN", zip: "55901",
    deadlineISO: "2026-11-22", daysLeft: null,
    sourceUrl: "#", photoEmoji: "🐱", tile: "#ffd9d9",
    notes: "Mittens is a calm 10-year-old lap cat whose owner passed away. Seniors are always the first on the list and the last to be chosen — she just wants a quiet window seat and a person of her own.",
  },
  {
    id: "mn-003", name: "Rocky", species: "dog", breed: "Pit Bull Terrier mix",
    sex: "Male", ageGroup: "Young", shelter: "Animal Humane Society",
    city: "Minneapolis", state: "MN", zip: "55401",
    deadlineISO: "2026-11-24", daysLeft: null,
    sourceUrl: "#", photoEmoji: "🐕", tile: "#d9ecff",
    notes: "Rocky is a wiggly, joyful 1-year-old who has been overlooked for months because of his breed. He passed his behavior evaluation with flying colors and adores every person he meets.",
  },
  {
    id: "mn-004", name: "Luna", species: "cat", breed: "Siamese mix",
    sex: "Female", ageGroup: "Adult", shelter: "Animal Humane Society",
    city: "Minneapolis", state: "MN", zip: "55401",
    deadlineISO: null, daysLeft: 4,
    sourceUrl: "#", photoEmoji: "🐈", tile: "#e6dcff",
    notes: "Luna is a chatty, affectionate Siamese mix who greets everyone at her kennel door. She is FIV-negative, litter-trained, and would love a home where someone is around most of the day.",
  },
  {
    id: "mn-005", name: "Old Dan", species: "dog", breed: "Beagle",
    sex: "Male", ageGroup: "Senior", shelter: "St. Paul Animal Services",
    city: "St. Paul", state: "MN", zip: "55101",
    deadlineISO: "2026-11-25", daysLeft: null,
    sourceUrl: "#", photoEmoji: "🐶", tile: "#dff3d8",
    notes: "Old Dan is a 9-year-old beagle with a gray muzzle and a puppy's heart. He was found as a stray and nobody came for him. He needs a soft bed, short walks, and someone to love him for his golden years.",
  },
  {
    id: "tx-001", name: "Bella", species: "dog", breed: "German Shepherd mix",
    sex: "Female", ageGroup: "Adult", shelter: "Harris County Pets",
    city: "Houston", state: "TX", zip: "77002",
    deadlineISO: "2026-11-21", daysLeft: null,
    sourceUrl: "#", photoEmoji: "🐕‍🦺", tile: "#ffe9c9",
    notes: "Bella is a loyal, smart shepherd who bonds hard with her person. She is on the list for space only — the shelter is at double capacity. She would thrive with an active adopter or even a short-term foster.",
  },
  {
    id: "tx-002", name: "Whiskers", species: "cat", breed: "Tabby",
    sex: "Male", ageGroup: "Young", shelter: "Harris County Pets",
    city: "Houston", state: "TX", zip: "77002",
    deadlineISO: "2026-11-22", daysLeft: null,
    sourceUrl: "#", photoEmoji: "🐱", tile: "#ffe0ec",
    notes: "Whiskers is a playful 8-month-old tabby who came in with his littermates — all adopted except him. He is the shelter clown and will keep you laughing.",
  },
  {
    id: "tx-003", name: "Duke", species: "dog", breed: "Boxer mix",
    sex: "Male", ageGroup: "Adult", shelter: "Dallas Animal Services",
    city: "Dallas", state: "TX", zip: "75201",
    deadlineISO: "2026-11-23", daysLeft: null,
    sourceUrl: "#", photoEmoji: "🐶", tile: "#d8f0ff",
    notes: "Duke is a goofy boxer mix who thinks he's a lap dog. He has been in the shelter for 90+ days, which puts him at the top of the urgent list. Dog-friendly and kid-approved.",
  },
  {
    id: "tx-004", name: "Clover", species: "other", breed: "Holland Lop rabbit",
    sex: "Female", ageGroup: "Young", shelter: "Dallas Animal Services",
    city: "Dallas", state: "TX", zip: "75201",
    deadlineISO: null, daysLeft: 5,
    sourceUrl: "#", photoEmoji: "🐰", tile: "#e2f7d9",
    notes: "Clover is a sweet, litter-trained Holland Lop who was surrendered after Easter. Rabbits are often forgotten on urgent lists — she needs a home or rescue placement this week.",
  },
  {
    id: "ca-001", name: "Sadie", species: "dog", breed: "Australian Cattle Dog mix",
    sex: "Female", ageGroup: "Adult", shelter: "LA Animal Services — North Central",
    city: "Los Angeles", state: "CA", zip: "90012",
    deadlineISO: "2026-11-21", daysLeft: null,
    sourceUrl: "#", photoEmoji: "🐕", tile: "#ffdfba",
    notes: "Sadie is a brilliant cattle dog who is deteriorating in the kennel from boredom — she needs a job and a person. Red-listed for length of stay. A foster home would save her while she waits for adoption.",
  },
  {
    id: "ca-002", name: "Oliver", species: "cat", breed: "Orange Tabby",
    sex: "Male", ageGroup: "Adult", shelter: "San Bernardino City Animal Shelter",
    city: "San Bernardino", state: "CA", zip: "92401",
    deadlineISO: "2026-11-22", daysLeft: null,
    sourceUrl: "#", photoEmoji: "🐈", tile: "#ffe8cc",
    notes: "Oliver is a big, mellow orange boy who head-butts hands through the kennel bars. He is on the urgent list because the cat room is beyond capacity. Neutered and ready to go home today.",
  },
  {
    id: "ca-003", name: "Pepper", species: "dog", breed: "Chihuahua mix",
    sex: "Female", ageGroup: "Senior", shelter: "San Bernardino City Animal Shelter",
    city: "San Bernardino", state: "CA", zip: "92401",
    deadlineISO: null, daysLeft: 2,
    sourceUrl: "#", photoEmoji: "🐶", tile: "#f3dcff",
    notes: "Pepper is a tiny 8-pound senior who shakes in her kennel — small dogs like her shut down in the shelter and get listed fast. She just needs a warm lap. Seniors make the most grateful companions.",
  },
  {
    id: "il-001", name: "Max", species: "dog", breed: "Husky mix",
    sex: "Male", ageGroup: "Young", shelter: "Chicago Animal Care & Control",
    city: "Chicago", state: "IL", zip: "60601",
    deadlineISO: "2026-11-24", daysLeft: null,
    sourceUrl: "#", photoEmoji: "🐺", tile: "#dceeff",
    notes: "Max is a striking husky mix with energy to spare and a heart of gold. High-energy dogs are listed quickly in crowded city shelters. He'd love a runner, a yard, or a foster with another playful dog.",
  },
  {
    id: "az-001", name: "Ruby", species: "cat", breed: "Calico",
    sex: "Female", ageGroup: "Adult", shelter: "Maricopa County Animal Care",
    city: "Phoenix", state: "AZ", zip: "85003",
    deadlineISO: "2026-11-25", daysLeft: null,
    sourceUrl: "#", photoEmoji: "🐱", tile: "#ffdfdf",
    notes: "Ruby is a beautiful calico who raised a litter of kittens at the shelter — all adopted, and now she's out of time herself. Calm, tidy, and quietly affectionate.",
  },
];

/* ------------------------------------------------------------
   SHELTER REGISTRY — the long-term data backbone of this app.
   The goal is every shelter in every US town and county that
   publishes an urgent / euthanasia list. Each registry entry:
     id, name, city, county, state, zip, website,
     urgentListUrl (direct link to the shelter's urgent list, or null),
     platform — where the shelter's animals are listed, which decides
                which adapter (below) will pull them:
                "petfinder" | "adoptapet" | "shelterluv" |
                "petango"   | "website"   | "facebook"
   Shelters marked `sample: true` have demo listings above; the rest
   are registry-only until their adapter goes live — no animal data
   is invented for them.
   ------------------------------------------------------------ */
const SHELTERS = [
  // --- Shelters behind the sample listings ---
  { id: "paws-claws-rochester", name: "Paws & Claws Humane Society", city: "Rochester", county: "Olmsted County", state: "MN", zip: "55901", website: "pawsandclaws.org", urgentListUrl: null, platform: "petfinder", sample: true },
  { id: "ahs-minneapolis", name: "Animal Humane Society", city: "Minneapolis", county: "Hennepin County", state: "MN", zip: "55401", website: "animalhumanesociety.org", urgentListUrl: null, platform: "petfinder", sample: true },
  { id: "stpaul-animal-services", name: "St. Paul Animal Services", city: "St. Paul", county: "Ramsey County", state: "MN", zip: "55101", website: "stpaul.gov", urgentListUrl: null, platform: "website", sample: true },
  { id: "harris-county-pets", name: "Harris County Pets", city: "Houston", county: "Harris County", state: "TX", zip: "77002", website: "countypets.com", urgentListUrl: null, platform: "website", sample: true },
  { id: "dallas-animal-services", name: "Dallas Animal Services", city: "Dallas", county: "Dallas County", state: "TX", zip: "75201", website: "dallasanimalservices.org", urgentListUrl: null, platform: "facebook", sample: true },
  { id: "la-animal-services", name: "LA Animal Services — North Central", city: "Los Angeles", county: "Los Angeles County", state: "CA", zip: "90012", website: "laanimalservices.com", urgentListUrl: null, platform: "website", sample: true },
  { id: "san-bernardino-shelter", name: "San Bernardino City Animal Shelter", city: "San Bernardino", county: "San Bernardino County", state: "CA", zip: "92401", website: "sbcityanimals.org", urgentListUrl: null, platform: "petfinder", sample: true },
  { id: "chicago-acc", name: "Chicago Animal Care & Control", city: "Chicago", county: "Cook County", state: "IL", zip: "60601", website: "chicagoanimalcare.org", urgentListUrl: null, platform: "website", sample: true },
  { id: "maricopa-acc", name: "Maricopa County Animal Care", city: "Phoenix", county: "Maricopa County", state: "AZ", zip: "85003", website: "pets.maricopa.gov", urgentListUrl: null, platform: "website", sample: true },
  // --- High-intake municipal shelters that publish urgent lists (registry only) ---
  { id: "nyc-acc", name: "Animal Care Centers of NYC (ACC)", city: "New York", county: "New York County", state: "NY", zip: "10029", website: "nycacc.org", urgentListUrl: null, platform: "petfinder" },
  { id: "houston-barc", name: "BARC Animal Shelter (Houston)", city: "Houston", county: "Harris County", state: "TX", zip: "77026", website: "houstontx.gov/barc", urgentListUrl: null, platform: "website" },
  { id: "san-antonio-acs", name: "San Antonio Animal Care Services", city: "San Antonio", county: "Bexar County", state: "TX", zip: "78227", website: "sanantonio.gov/acs", urgentListUrl: null, platform: "website" },
  { id: "fort-worth-acc", name: "Fort Worth Animal Care & Control", city: "Fort Worth", county: "Tarrant County", state: "TX", zip: "76102", website: "fortworthtexas.gov/animals", urgentListUrl: null, platform: "petango" },
  { id: "memphis-mas", name: "Memphis Animal Services", city: "Memphis", county: "Shelby County", state: "TN", zip: "38133", website: "memphisanimalservices.com", urgentListUrl: null, platform: "petfinder" },
  { id: "miami-dade-asd", name: "Miami-Dade Animal Services", city: "Doral", county: "Miami-Dade County", state: "FL", zip: "33178", website: "miamidade.gov/animals", urgentListUrl: null, platform: "website" },
  { id: "fulton-county-as", name: "Fulton County Animal Services", city: "Atlanta", county: "Fulton County", state: "GA", zip: "30318", website: "fultonanimalservices.com", urgentListUrl: null, platform: "shelterluv" },
  { id: "baltimore-barc", name: "BARCS (Baltimore Animal Rescue & Care Shelter)", city: "Baltimore", county: "Baltimore City", state: "MD", zip: "21230", website: "barcs.org", urgentListUrl: null, platform: "shelterluv" },
  { id: "kern-county-as", name: "Kern County Animal Services", city: "Bakersfield", county: "Kern County", state: "CA", zip: "93308", website: "kerncountyanimalservices.org", urgentListUrl: null, platform: "adoptapet" },
];

/* ------------------------------------------------------------
   ADAPTER LAYER — one fetcher per platform type. Every adapter
   returns a Promise of listings in the exact LISTINGS shape
   (id, name, species, breed, sex, ageGroup, shelter, city, state,
   zip, deadlineISO/daysLeft, sourceUrl, photoEmoji, tile, notes)
   filtered to URGENT / red-listed animals only.

   Status: fetchRescueGroups() (immediately below) is implemented and
   wired as the first live source — it no-ops until an API key is
   pasted into API_CONFIG. The per-platform adapters after it still
   return [] — going live for those = filling them in, one platform
   at a time; loadListings() already merges whatever they return.
   ------------------------------------------------------------ */

/* ------------------------------------------------------------
   RescueGroups.org — FIRST LIVE SOURCE (wired Nov 20, 2026).
   RescueGroups' v5 API (https://api.rescuegroups.org/v5) is the one
   major aggregator that carries euthanasia data as fields —
   attributes.killDate / attributes.killReason — and it searches by
   postal code + distance, which is exactly this app's model.
   Docs: https://api.rescuegroups.org/v5/public/docs
   (An API key was requested Nov 20, 2026; until it arrives and is
   pasted into API_CONFIG.rescueGroupsApiKey this adapter no-ops.)

   Contract, same as every adapter here: returns a Promise of
   listings in the LISTINGS shape and NEVER throws — any problem
   (no key, bad ZIP, network error, API error) resolves to [] so
   loadListings() can always proceed.
   ------------------------------------------------------------ */
const RESCUEGROUPS_SOURCE_LABEL = "RescueGroups.org";

// Resolve a JSON:API relationship (single object or array) to the
// attributes of the matching entries in the response's `included`.
function rgRelated(animal, relName, includedIndex) {
  const rel = animal && animal.relationships ? animal.relationships[relName] : null;
  if (!rel || !rel.data) return [];
  const refs = Array.isArray(rel.data) ? rel.data : [rel.data];
  return refs
    .map((ref) => includedIndex.get(`${ref.type}:${ref.id}`))
    .filter(Boolean)
    .map((entry) => entry.attributes || {});
}

function rgAgeGroup(raw) {
  switch (String(raw || "").trim().toLowerCase()) {
    case "baby": return "Puppy/Kitten";
    case "young":
    case "young adult": return "Young";
    case "senior": return "Senior";
    default: return "Adult";
  }
}

// URLs from the API land in <img src> / <a href> — strip characters
// that could break out of the attribute.
function rgUrl(raw) {
  return raw ? String(raw).replace(/["'<>]/g, "") : "";
}

// Map one v5 animal resource onto the LISTINGS shape — or return null
// to leave the animal out entirely (see the red-list filter below).
function mapRescueGroupsAnimal(animal, includedIndex) {
  const a = animal.attributes || {};
  const killDateRaw = a.killDate ? String(a.killDate).trim() : "";
  const killReason = a.killReason ? String(a.killReason).trim() : "";

  // RED-LIST FILTER — deliberate choice: this app lists ONLY red-listed
  // animals, and every card in the UI wears the "🚨 RED LIST — URGENT"
  // badge; there is no non-urgent presentation. So a RescueGroups
  // record is included ONLY when it carries euthanasia data (a
  // killDate and/or a killReason). Available animals with neither are
  // ordinary adoptables and are skipped rather than mislabeled urgent.
  if (!killDateRaw && !killReason) return null;

  const speciesName = ((rgRelated(animal, "species", includedIndex)[0] || {}).singular || "").toLowerCase();
  const species = speciesName === "dog" ? "dog" : speciesName === "cat" ? "cat" : "other";

  const org = rgRelated(animal, "orgs", includedIndex)[0] || {};
  const loc = rgRelated(animal, "locations", includedIndex)[0] || {};

  // Photo: first picture relationship (lowest `order` — order 1 is the
  // org's chosen first photo); fall back to the thumbnail attribute.
  const picRefs = (animal.relationships && animal.relationships.pictures && animal.relationships.pictures.data) || [];
  const picAttrs = (Array.isArray(picRefs) ? picRefs : [picRefs])
    .map((ref) => includedIndex.get(`pictures:${ref.id}`))
    .filter(Boolean)
    .map((entry) => entry.attributes || {})
    .sort((x, y) => (x.order || 99) - (y.order || 99));
  let photo = null;
  if (picAttrs.length) photo = rgUrl(picAttrs[0].large || picAttrs[0].original || picAttrs[0].small) || null;
  if (!photo && a.pictureThumbnailUrl) photo = rgUrl(a.pictureThumbnailUrl) || null;

  const deadlineISO = /^\d{4}-\d{2}-\d{2}/.test(killDateRaw) ? killDateRaw.slice(0, 10) : null;

  let notes = a.descriptionText ? String(a.descriptionText).trim() : "";
  if (notes.length > 600) notes = notes.slice(0, 597).trimEnd() + "…";
  if (killReason) notes = [notes, `Listed reason: ${killReason}.`].filter(Boolean).join(" ");
  if (!notes) {
    notes = "This animal is on a euthanasia list published through RescueGroups.org and is out of time. Please contact the shelter right away to adopt, foster, or rescue.";
  }

  return {
    id: `rg-${animal.id}`,
    name: esc(a.name ? String(a.name).trim() : "") || "Name unknown",
    species,
    breed: esc(a.breedString || a.breedPrimary || "") || "Breed unknown",
    sex: a.sex === "Male" || a.sex === "Female" ? a.sex : "Unknown",
    ageGroup: rgAgeGroup(a.ageGroup),
    shelter: esc(org.name || loc.name || "") || "Shelter listing via RescueGroups.org",
    city: esc(loc.city || org.city || ""),
    state: esc(loc.state || org.state || ""),
    zip: String(loc.postalcode || org.postalcode || ""),
    deadlineISO,          // the euthanasia date drives the countdown UI
    daysLeft: null,
    sourceUrl: rgUrl(a.url || org.url || ""),
    source: RESCUEGROUPS_SOURCE_LABEL,
    photo,                // remote URL (the shape's data-URL uploads render the same way)
    photoEmoji: SPECIES_EMOJI[species] || "🐾",
    tile: SPECIES_TILE[species] || "#ffe3b3",
    notes: esc(notes),
  };
}

function mapRescueGroupsResults(json) {
  const data = json && Array.isArray(json.data) ? json.data : [];
  const includedIndex = new Map();
  (json && Array.isArray(json.included) ? json.included : []).forEach((entry) => {
    if (entry && entry.type && entry.id) includedIndex.set(`${entry.type}:${entry.id}`, entry);
  });
  return data
    .map((animal) => {
      try { return mapRescueGroupsAnimal(animal, includedIndex); }
      catch (err) { console.warn("RedList Rescue: skipped a malformed RescueGroups record.", err); return null; }
    })
    .filter(Boolean);
}

async function fetchRescueGroups(zip, radiusMiles) {
  const apiKey = API_CONFIG.rescueGroupsApiKey;
  if (!apiKey) return []; // no key yet — silent no-op, like the stubs below
  const postal = String(zip || "").trim();
  if (!/^\d{5}$/.test(postal)) return []; // a radius search needs a ZIP
  const miles = [10, 25, 50, 100].includes(radiusMiles) ? radiusMiles : 25;
  const base = API_CONFIG.rescueGroupsBaseUrl.replace(/\/+$/, "");
  const headers = {
    "Content-Type": "application/vnd.api+json",
    // v5 public-data auth: the raw API key in the Authorization header
    // (NOT "Bearer …" — that form is for token / private-data access).
    Authorization: apiKey,
  };
  const body = JSON.stringify({
    data: {
      // Radius search: location + distance together in one object.
      filterRadius: { miles, postalcode: postal },
    },
  });
  // Try with explicit includes first (orgs / pictures / species /
  // locations power the mapping above); if the API rejects the request
  // — an unrecognized include name earns an HTTP 400 — retry once with
  // the API's default fields/includes before giving up. NOTE: only the
  // first page (up to 250 animals) is fetched; paging is a TODO for
  // when the key lands and real result volumes are known.
  const attempts = [
    `${base}/public/animals/search/available?limit=250&include=orgs,pictures,species,locations`,
    `${base}/public/animals/search/available?limit=250`,
  ];
  for (const url of attempts) {
    try {
      const res = await fetch(url, { method: "POST", headers, body });
      if (!res.ok) {
        console.warn(`RedList Rescue: RescueGroups search returned HTTP ${res.status} — continuing without live results.`);
        continue;
      }
      return mapRescueGroupsResults(await res.json());
    } catch (err) {
      console.warn("RedList Rescue: RescueGroups search failed — continuing without live results.", err);
    }
  }
  return [];
}

// Petfinder API v2 — ⚠️ DECOMMISSIONED Dec 2, 2025 (see DATA-SOURCES.md).
// Petfinder shut the API down entirely, and even while it lived its
// status filter (adoptable / adopted / found) never carried a
// euthanasia / red-list flag. This stub remains ONLY so the SHELTERS
// registry's "petfinder" platform labels keep resolving — do NOT wire
// it up. Petfinder's only remaining route is a Member Success
// partnership (help@petfinder.com), not an API key.
async function fetchPetfinder(/* shelter */) {
  // TODO: token POST /oauth2/token, fetch animals, normalize, filter urgent.
  return [];
}

// Adopt-a-Pet: shelters expose a public listings feed / embed API;
// fetch the shelter's feed, normalize, keep urgent-flagged animals.
async function fetchAdoptAPet(/* shelter */) {
  // TODO: fetch shelter feed from adoptapet.com shelter pages, normalize.
  return [];
}

// ShelterLuv: shelters have a public API endpoint
// (www.shelterluv.com/api/v1/animals?organization_id=...) with an API key;
// fetch available animals, keep those with urgent status attributes.
async function fetchShelterLuv(/* shelter */) {
  // TODO: fetch ShelterLuv API for the shelter, normalize, filter urgent.
  return [];
}

// Petango: shelter listings are served via Petango's public search /
// shelter widget feeds; fetch the shelter's Petango feed and normalize.
async function fetchPetango(/* shelter */) {
  // TODO: fetch Petango shelter feed, normalize, filter urgent.
  return [];
}

// Shelter's own website: many municipal shelters publish an urgent-list
// page (shelter.urgentListUrl when known, else their animals page).
// Fetch + parse that page (server-side, to respect CORS/robots) and
// normalize the animals it lists.
async function fetchShelterSite(/* shelter */) {
  // TODO: fetch shelter.urgentListUrl || shelter website, parse, normalize.
  return [];
}

// Facebook: many red-listed animals are posted ONLY in Facebook rescue
// groups (and some shelters, e.g. Dallas, post their urgent lists only
// as Facebook posts). There is no public API for group content, so the
// live method is assisted, human-in-the-loop intake — three channels:
//   1. Groups the account holder (Sami) is herself a member of, read
//      through her own signed-in Facebook access: she (or Baxter, in a
//      session she is signed into) reads the urgent posts and the
//      animals are keyed in / confirmed from them.
//   2. Partnerships with group admins and shelter page admins, who
//      share their urgent lists directly for inclusion.
//   3. The in-app "Submit a listing" form (see below), where anyone who
//      saw a red-listed animal posted can submit it with the post link;
//      submissions are reviewed before going fully public.
// Deliberately NOT an automated crawler/scraper: Facebook blocks those,
// they break constantly, and automated scraping of her account would
// risk the account itself. This adapter stays a stub returning []
// until the assisted-intake pipeline behind it exists.
async function fetchFacebookUrgentList(/* shelter */) {
  // TODO (assisted intake, not a crawler): normalize animals gathered
  // from member-group posts, admin partnerships, and reviewed
  // "Submit a listing" submissions into the LISTINGS shape.
  return [];
}

const PLATFORM_ADAPTERS = {
  petfinder: fetchPetfinder,
  adoptapet: fetchAdoptAPet,
  shelterluv: fetchShelterLuv,
  petango: fetchPetango,
  website: fetchShelterSite,
  facebook: fetchFacebookUrgentList,
};

/* ------------------------------------------------------------
   Data layer — merges the sample listings with live results:
   RescueGroups.org first, then whatever the per-shelter platform
   adapters return (today: nothing). Deduplicated by id,
   so live data can override/extend the samples as adapters land.
   ------------------------------------------------------------ */
async function loadListings() {
  // FIRST live source: the RescueGroups.org ZIP + radius search. It is
  // location-based rather than per-shelter, so it runs ahead of the
  // platform adapters below. It no-ops to [] until an API key is
  // pasted into API_CONFIG — and, being a radius search, until a ZIP
  // search has actually been made (state.zip is "" in browse mode).
  const rgResults = await fetchRescueGroups(state.zip, state.radius).catch(() => []);
  const adapterResults = await Promise.all(
    SHELTERS.map((shelter) => {
      const adapter = PLATFORM_ADAPTERS[shelter.platform];
      return adapter ? adapter(shelter).catch(() => []) : Promise.resolve([]);
    })
  );
  const byId = new Map();
  LISTINGS.forEach((l) => byId.set(l.id, l));
  [...rgResults, ...adapterResults.flat()].forEach((l) => { if (l && l.id) byId.set(l.id, l); });
  return [...byId.values()];
}

// Re-run the data layer and re-render. Called on first load, and again
// whenever the search ZIP or radius changes, so the RescueGroups
// radius query (and any future live adapter) stays current.
function refreshListings() {
  return loadListings().then((listings) => {
    state.listings = listings;
    render();
  });
}

/* ---------------- Distance helpers ---------------- */

function zipCoords(zip) {
  const c = ZIP_CENTROIDS[zip];
  return c ? { lat: c[0], lon: c[1] } : null;
}

function haversineMiles(a, b) {
  const R = 3958.8; // Earth radius, miles
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/* ---------------- Urgency helpers ---------------- */

// Days left: derived from deadlineISO when present, else the stored daysLeft.
function daysLeftFor(listing, now) {
  if (listing.deadlineISO) {
    const dl = new Date(listing.deadlineISO + "T23:59:59");
    return Math.ceil((dl - now) / 86400000);
  }
  return listing.daysLeft; // may be null = no published deadline
}

function deadlineText(listing, days) {
  if (days === null || days === undefined) return "On the urgent list — no public deadline. Please don't wait.";
  if (days <= 0) return "⚠ Deadline: TODAY — this is their last day";
  if (days === 1) return "⚠ Only 1 day left — deadline tomorrow";
  return `⏰ ${days} days left`;
}

function deadlineDateText(listing) {
  if (!listing.deadlineISO) return "";
  const d = new Date(listing.deadlineISO + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/* ---------------- App state + rendering ---------------- */

const state = {
  listings: [],
  zip: "",          // searched ZIP ("" = browse mode)
  origin: null,     // coords of searched ZIP, or null
  radius: 25,
  species: "all",
};

const $ = (id) => document.getElementById(id);

function matchesSpecies(l) {
  return state.species === "all" || l.species === state.species;
}

function decorate(l, now) {
  const days = daysLeftFor(l, now);
  const coords = zipCoords(l.zip);
  const dist = state.origin && coords ? haversineMiles(state.origin, coords) : null;
  return { ...l, _days: days, _dist: dist };
}

function sortUrgent(a, b) {
  const da = a._days === null ? 9999 : a._days;
  const db = b._days === null ? 9999 : b._days;
  if (da !== db) return da - db;
  const ta = a._dist === null ? 1e9 : a._dist;
  const tb = b._dist === null ? 1e9 : b._dist;
  return ta - tb;
}

function cardHTML(l) {
  const soon = l._days !== null && l._days <= 1;
  const distLine =
    l._dist !== null ? `<p class="card-distance">📍 About ${Math.max(1, Math.round(l._dist))} miles away</p>` : "";
  const dateTxt = deadlineDateText(l);
  const srcIcon = l.source === SHELTER_SOURCE_LABEL ? "🏠" : "📣";
  return `
  <article class="card" data-id="${l.id}" tabindex="0" role="button" aria-label="See details for ${l.name}">
    <div class="card-photo" style="background:${l.tile}">
      ${l.photo ? `<img class="card-img" src="${l.photo}" alt="Photo of ${l.name}">` : ""}
      <span class="badge-urgent">🚨 RED LIST — URGENT</span>
      ${l.photo ? "" : `<span class="photo-emoji" aria-hidden="true">${l.photoEmoji}</span>`}
    </div>
    <div class="card-body">
      <h3 class="card-name">${l.name}</h3>
      <p class="card-meta">${l.breed} · ${l.sex} · ${l.ageGroup}</p>
      <p class="card-where">🏠 ${l.shelter} — ${l.city}, ${l.state} ${l.zip}</p>
      ${l.source ? `<p class="card-source">${srcIcon} ${l.source}</p>` : ""}
      <p class="card-deadline${soon ? " soon" : ""}">${deadlineText(l, l._days)}${dateTxt ? ` (${dateTxt})` : ""}</p>
      ${distLine}
      <div class="btn-meet"><span>Meet ${l.name} / adoption info →</span></div>
    </div>
  </article>`;
}

function render() {
  const now = new Date();
  const all = state.listings.map((l) => decorate(l, now)).filter((l) => !l.adopted).filter(matchesSpecies);
  const listingsEl = $("listings");
  const emptyEl = $("emptyState");

  if (state.zip && state.origin) {
    // Search mode: within radius, sorted by urgency then distance.
    const within = all.filter((l) => l._dist !== null && l._dist <= state.radius).sort(sortUrgent);
    $("resultsHead").classList.remove("hidden");
    $("resultsTitle").textContent =
      within.length === 1 ? "1 animal needs you" : `${within.length} animals need you`;
    $("resultsSub").textContent = `Red-listed animals within ${state.radius} miles of ${state.zip}, most urgent first.`;
    listingsEl.innerHTML = within.length
      ? `<div class="cards">${within.map(cardHTML).join("")}</div>`
      : "";
    emptyEl.classList.toggle("hidden", within.length > 0);
    if (!within.length) {
      $("emptyTitle").textContent = `No red-listed animals within ${state.radius} miles of ${state.zip}`;
      $("emptyText").textContent = "Try a wider radius — an extra few miles can save a life.";
    }
  } else if (state.zip && !state.origin) {
    // ZIP not in the centroid table: grouping-only fallback for that ZIP.
    const here = all.filter((l) => l.zip === state.zip).sort(sortUrgent);
    $("resultsHead").classList.remove("hidden");
    $("resultsTitle").textContent = `Animals listed under ZIP ${state.zip}`;
    $("resultsSub").textContent =
      "We don't have map coordinates for that ZIP yet, so here are the listings filed under it — or browse all listings by ZIP below.";
    const rest = all.filter((l) => l.zip !== state.zip);
    listingsEl.innerHTML =
      (here.length ? `<div class="cards">${here.map(cardHTML).join("")}</div>` : "") +
      groupedHTML(rest, now);
    emptyEl.classList.toggle("hidden", all.length > 0);
  } else {
    // Browse mode: everything, grouped by ZIP.
    $("resultsHead").classList.add("hidden");
    listingsEl.innerHTML = groupedHTML(all, now);
    emptyEl.classList.toggle("hidden", all.length > 0);
    if (!all.length) {
      $("emptyTitle").textContent = "No red-listed animals match that filter";
      $("emptyText").textContent = "Try a different species filter above.";
    }
  }

  wireCards();
}

function groupedHTML(items, now) {
  const byZip = new Map();
  items.forEach((l) => {
    if (!byZip.has(l.zip)) byZip.set(l.zip, []);
    byZip.get(l.zip).push(l);
  });
  const zips = [...byZip.keys()].sort();
  return zips
    .map((zip) => {
      const group = byZip.get(zip).sort(sortUrgent);
      const place = `${group[0].city}, ${group[0].state}`;
      return `<h3 class="zip-heading">📍 ZIP ${zip} — ${place} <span class="zip-count">(${group.length} urgent)</span></h3>
              <div class="cards">${group.map(cardHTML).join("")}</div>`;
    })
    .join("");
}

function wireCards() {
  document.querySelectorAll(".card").forEach((card) => {
    const open = () => openDetail(card.getAttribute("data-id"));
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });
}

/* ---------------- Detail view ---------------- */

function openDetail(id) {
  const now = new Date();
  const raw = state.listings.find((l) => l.id === id);
  if (!raw) return;
  const l = decorate(raw, now);
  const soon = l._days !== null && l._days <= 1;
  const dateTxt = deadlineDateText(l);
  const isDemo = l.sourceUrl === "#" || !l.sourceUrl;
  const srcIcon = l.source === SHELTER_SOURCE_LABEL ? "🏠" : "📣";
  $("detailBody").innerHTML = `
    <div class="detail-photo" style="background:${l.tile}">
      ${l.photo ? `<img class="detail-img" src="${l.photo}" alt="Photo of ${l.name}">` : ""}
      <span class="badge-urgent">🚨 RED LIST — URGENT</span>
      ${l.photo ? "" : `<span class="photo-emoji" aria-hidden="true">${l.photoEmoji}</span>`}
    </div>
    <div class="detail-inner">
      <h2 id="detailName">${l.name}</h2>
      <p class="detail-row">${l.breed} · ${l.sex} · ${l.ageGroup}</p>
      <p class="detail-row"><span class="k">Shelter:</span> ${l.shelter}</p>
      <p class="detail-row"><span class="k">Location:</span> ${l.city}, ${l.state} ${l.zip}${
        l._dist !== null ? ` — about ${Math.max(1, Math.round(l._dist))} miles from ${state.zip}` : ""
      }</p>
      ${l.source ? `<p class="detail-row"><span class="k">Source:</span> ${srcIcon} ${l.source}</p>` : ""}
      <p class="card-deadline${soon ? " soon" : ""}">${deadlineText(l, l._days)}${dateTxt ? ` — ${dateTxt}` : ""}</p>
      <div class="detail-notes">${l.notes}</div>
      <div class="detail-cta">
        <a href="${isDemo ? "#" : l.sourceUrl}" ${isDemo ? "" : 'target="_blank" rel="noopener"'}>Meet ${l.name} / adoption info →</a>
      </div>
      ${isDemo ? '<p class="detail-source-note">Demo listing — in the live app this button opens the shelter\'s own page for this animal.</p>' : ""}
      ${l.source === SHELTER_SOURCE_LABEL ? '<p class="detail-source-note">Listed directly by the shelter. In the live app, shelters are verified before their listings are featured.</p>' : l.source === COMMUNITY_SOURCE_LABEL ? '<p class="detail-source-note">Community-submitted — in the live app, submissions are reviewed before going fully public. Please confirm via the original post that this animal still needs help.</p>' : l.source ? `<p class="detail-source-note">Listing data via ${l.source} — please confirm with the shelter that this animal still needs help before traveling.</p>` : ""}
    </div>`;
  $("detailOverlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeDetail() {
  $("detailOverlay").classList.add("hidden");
  document.body.style.overflow = "";
}

/* ---------------- Coverage view ----------------
   The shelter registry, grouped by state (county shown per shelter),
   so visitors can see where the app tracks urgent lists — and where
   it still needs to grow. */
function renderCoverage() {
  const el = $("coverageList");
  if (!el) return;
  const byState = new Map();
  SHELTERS.forEach((s) => {
    if (!byState.has(s.state)) byState.set(s.state, []);
    byState.get(s.state).push(s);
  });
  const platformLabel = {
    petfinder: "Petfinder", adoptapet: "Adopt-a-Pet", shelterluv: "ShelterLuv",
    petango: "Petango", website: "Shelter website", facebook: "Facebook urgent list",
  };
  el.innerHTML = [...byState.keys()].sort().map((st) => {
    const group = byState.get(st).slice().sort((a, b) => a.city.localeCompare(b.city));
    return `<h3 class="zip-heading">🗺️ ${st} <span class="zip-count">(${group.length} shelter${group.length === 1 ? "" : "s"})</span></h3>
      <div class="coverage-grid">${group.map((s) => `
        <div class="coverage-card">
          <p class="coverage-name">${s.name}</p>
          <p class="coverage-where">${s.city}${s.county ? ` · ${s.county}` : ""} · ${s.zip}</p>
          <p class="coverage-meta">🌐 ${s.website} · via ${platformLabel[s.platform] || s.platform}${s.sample ? ' · <strong>live in this demo</strong>' : ""}${s.status ? ` · <span class="badge-partner">${s.status}</span>` : ""}</p>
        </div>`).join("")}
      </div>`;
  }).join("");
  const n = $("coverageCount");
  if (n) n.textContent = SHELTERS.length;
}

/* ---------------- Submit a listing (community intake) ----------------
   For animals people saw posted in Facebook rescue groups (or anywhere
   else) that aren't in the shelter feeds yet. PROTOTYPE NOTE: this is
   in-memory only — there is no backend, submissions live in
   state.listings for this page session and are gone on reload. In the
   live version the form posts to a review queue and a submission only
   goes fully public after review (the form copy says so honestly). */

const COMMUNITY_SOURCE_LABEL = "Community submitted — Facebook group";
const SPECIES_EMOJI = { dog: "🐶", cat: "🐱", other: "🐰" };
const SPECIES_TILE = { dog: "#ffe3b3", cat: "#ffd9d9", other: "#e2f7d9" };

// Escape user-entered text before it is stored/rendered as HTML.
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function openSubmit() {
  $("submitMsg").textContent = "";
  $("submitOverlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeSubmit() {
  $("submitOverlay").classList.add("hidden");
  document.body.style.overflow = "";
}

function handleSubmitListing(e) {
  e.preventDefault();
  const name = $("fName").value.trim();
  const species = $("fSpecies").value;
  const zip = $("fZip").value.trim();
  const link = $("fLink").value.trim();
  if (!name || !/^\d{5}$/.test(zip) || !link) {
    $("submitMsg").textContent = "Please fill in the name, a 5-digit ZIP, and the link to the post.";
    return;
  }
  const deadline = $("fDeadline").value; // "YYYY-MM-DD" or ""
  const listing = {
    id: "community-" + Date.now(),
    name: esc(name),
    species,
    breed: esc($("fBreed").value.trim()) || "Breed unknown",
    sex: "Unknown",
    ageGroup: "Adult",
    shelter: esc($("fShelter").value.trim()) || "Community submission",
    city: esc($("fCity").value.trim()),
    state: esc($("fState").value.trim().toUpperCase()),
    zip,
    deadlineISO: /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : null,
    daysLeft: null,
    sourceUrl: esc(link),
    source: COMMUNITY_SOURCE_LABEL,
    photoEmoji: SPECIES_EMOJI[species] || "🐾",
    tile: SPECIES_TILE[species] || "#ffe3b3",
    notes: "This listing was submitted by a community member from a Facebook rescue group post. The details come from that post — please use the source link to reach the shelter or poster and confirm this animal is still in need before traveling.",
  };
  LISTINGS.push(listing);        // keep the base data in sync…
  state.listings.push(listing);  // …and the live in-memory list render() uses.
  closeSubmit();
  e.target.reset();
  // Show the new listing: switch to browse mode so it can't hide behind
  // a radius filter, thank the submitter, and scroll to the listings.
  state.zip = "";
  state.origin = null;
  $("zipInput").value = "";
  $("searchMsg").textContent = `✅ Thank you! ${listing.name} was added below — look for the “${COMMUNITY_SOURCE_LABEL}” label.`;
  render();
  $("listings").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------------- Shelter accounts + dashboard ----------------
   PROTOTYPE — IN-MEMORY DEMO ONLY. Accounts live in a plain JS array
   for this page session: nothing is persisted (no localStorage, no
   backend, nothing is sent anywhere) and passwords are never logged.
   Refreshing the page wipes every account and shelter-added animal.
   The live version replaces this with a real backend: hashed
   passwords, email confirmation, and manual shelter verification
   before a partner's listings are featured. (Demo behavior shows a
   new partner's listings right away, badged "pending verification".)

   Account creation IS the shelter join flow: signing up adds the
   shelter to the SHELTERS registry with status
   "Partner — pending verification", so it appears in Coverage. */

const SHELTER_SOURCE_LABEL = "Shelter submitted";
const ACCOUNTS = []; // { id, shelterId, shelterName, contact, email, password, city, state, zip, website, shareMethod }
const authSession = { accountId: null };

function currentAccount() {
  return ACCOUNTS.find((a) => a.id === authSession.accountId) || null;
}

function siteUrl(raw) {
  if (!raw) return "#";
  return /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
}

function siteHost(raw) {
  return String(raw || "").replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
}

/* ----- Auth overlay ----- */

function openAuth(mode) {
  const isSignUp = mode !== "signin";
  $("signUpForm").classList.toggle("hidden", !isSignUp);
  $("signInForm").classList.toggle("hidden", isSignUp);
  $("authTitle").textContent = isSignUp ? "Join RedList Rescue" : "Shelter sign in";
  $("signUpMsg").textContent = "";
  $("signInMsg").textContent = "";
  $("authOverlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeAuth() {
  $("authOverlay").classList.add("hidden");
  if ($("dashOverlay").classList.contains("hidden")) document.body.style.overflow = "";
}

/* Email a shelter/rescue join request to Sami (via FormSubmit) so the
   request survives the demo session and she can verify the partner.
   The account password is NEVER included. */
async function sendJoinRequest(account) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch("https://formsubmit.co/ajax/farmledgercare@gmail.com", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: `RedList Rescue join request — ${account.shelterName}`,
        _template: "table",
        "Shelter / rescue": account.shelterName,
        "Contact person": account.contact,
        Email: account.email,
        City: account.city,
        State: account.state,
        ZIP: account.zip,
        Website: account.website || "—",
        "How they share urgent animals": account.shareMethod,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    clearTimeout(timer);
    return false;
  }
}

async function handleSignUp(e) {
  e.preventDefault();
  const email = $("sEmail").value.trim().toLowerCase();
  if (ACCOUNTS.some((a) => a.email === email)) {
    $("signUpMsg").textContent = "That email already has an account — try signing in instead.";
    return;
  }
  if (!$("sAuthorized").checked) {
    $("signUpMsg").textContent = "Please confirm you're authorized to list animals for this shelter.";
    return;
  }
  const shareMethod = $("sShare").value;
  const websiteRaw = $("sWebsite").value.trim();
  const shelterId = "partner-" + Date.now();
  const account = {
    id: "acct-" + Date.now(),
    shelterId,
    shelterName: esc($("sName").value.trim()),
    contact: esc($("sContact").value.trim()),
    email,
    password: $("sPassword").value, // demo only — held in memory, never logged or stored
    city: esc($("sCity").value.trim()),
    state: esc($("sState").value.trim().toUpperCase()),
    zip: $("sZip").value.trim(),
    website: websiteRaw,
    shareMethod,
  };
  ACCOUNTS.push(account);
  // Joining = joining the registry, pending verification.
  SHELTERS.push({
    id: shelterId,
    name: account.shelterName,
    city: account.city,
    county: null,
    state: account.state,
    zip: account.zip,
    website: siteHost(websiteRaw) || "—",
    urgentListUrl: null,
    platform: shareMethod === "facebook" ? "facebook" : shareMethod === "petfinder" ? "petfinder" : "website",
    status: "Partner — pending verification",
    partner: true,
  });
  authSession.accountId = account.id;
  const form = e.target;
  const requestSent = await sendJoinRequest(account);
  form.reset();
  closeAuth();
  renderCoverage();
  renderShelterActions();
  openDashboard(`🎉 Welcome to RedList Rescue, ${account.shelterName}! Your shelter is in the registry as a partner — pending verification. ${requestSent ? `Your join request was also emailed to the RedList Rescue team — we'll reach out at ${account.email} when you're verified.` : "We couldn't email your join request just now — please also email farmledgercare@gmail.com so we can verify you."} Add your first red-listed animal below.`);
}

function handleSignIn(e) {
  e.preventDefault();
  const email = $("iEmail").value.trim().toLowerCase();
  const account = ACCOUNTS.find((a) => a.email === email);
  if (!account || account.password !== $("iPassword").value) {
    $("signInMsg").textContent = "That email and password didn't match an account. (Demo accounts only live for this session.)";
    return;
  }
  authSession.accountId = account.id;
  e.target.reset();
  closeAuth();
  renderShelterActions();
  openDashboard();
}

function signOut() {
  authSession.accountId = null;
  closeDashboard();
  renderShelterActions();
}

/* ----- For Shelters action area (Join / Sign in / My Shelter) ----- */

function renderShelterActions() {
  const el = $("shelterActions");
  if (!el) return;
  const acct = currentAccount();
  if (acct) {
    el.innerHTML = `
      <p class="signed-in-note">✅ Signed in as <strong>${acct.shelterName}</strong> <span class="badge-partner">Partner — pending verification</span></p>
      <div class="shelter-btn-row">
        <button type="button" id="openDash" class="btn-primary">My Shelter dashboard</button>
        <button type="button" id="signOutBtn" class="btn-secondary">Sign out</button>
      </div>`;
    $("openDash").addEventListener("click", () => openDashboard());
    $("signOutBtn").addEventListener("click", signOut);
  } else {
    el.innerHTML = `
      <div class="shelter-btn-row">
        <button type="button" id="openJoin" class="btn-primary">Join RedList Rescue — it's free</button>
        <button type="button" id="openSignIn" class="btn-secondary">Shelter sign in</button>
      </div>`;
    $("openJoin").addEventListener("click", () => openAuth("signup"));
    $("openSignIn").addEventListener("click", () => openAuth("signin"));
  }
}

/* ----- Dashboard ----- */

function openDashboard(msg) {
  if (!currentAccount()) return;
  renderDashboard(msg);
  $("dashOverlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeDashboard() {
  $("dashOverlay").classList.add("hidden");
  if ($("animalOverlay").classList.contains("hidden") && $("authOverlay").classList.contains("hidden")) {
    document.body.style.overflow = "";
  }
}

function dashRowHTML(l) {
  const d = decorate(l, new Date());
  const thumb = l.photo
    ? `<img class="dash-thumb" src="${l.photo}" alt="">`
    : `<span class="dash-thumb-emoji" style="background:${l.tile}" aria-hidden="true">${l.photoEmoji}</span>`;
  return `
  <div class="dash-row">
    ${thumb}
    <div class="dash-row-main">
      <p class="dash-name">${l.name}</p>
      <p class="dash-meta">${l.breed} · ${l.sex} · ${l.ageGroup}</p>
      <p class="dash-meta">${deadlineText(l, d._days)}</p>
    </div>
    <div class="dash-actions">
      <button type="button" class="btn-small" data-act="edit" data-id="${l.id}">Edit</button>
      <button type="button" class="btn-small btn-happy" data-act="adopted" data-id="${l.id}">Mark adopted / rescued</button>
      <button type="button" class="btn-small btn-danger" data-act="remove" data-id="${l.id}">Remove</button>
    </div>
  </div>`;
}

function renderDashboard(msg) {
  const acct = currentAccount();
  if (!acct) return;
  const mine = state.listings.filter((l) => l.shelterId === acct.shelterId);
  const active = mine.filter((l) => !l.adopted);
  const saved = mine.filter((l) => l.adopted);
  $("dashBody").innerHTML = `
    <p class="dash-shelter">🏠 <strong>${acct.shelterName}</strong> — ${acct.city}, ${acct.state} ${acct.zip} <span class="badge-partner">Partner — pending verification</span></p>
    <p class="submit-note">Your animals appear in the public listings labeled “${SHELTER_SOURCE_LABEL}”. In the live app, shelters are verified before their listings are featured.</p>
    ${msg ? `<p class="dash-msg">${msg}</p>` : ""}
    <button type="button" id="addAnimalBtn" class="btn-primary submit-btn">＋ Add a red-listed animal</button>
    <h3 class="dash-h">Your animals on the list (${active.length})</h3>
    ${active.length ? active.map(dashRowHTML).join("") : '<p class="submit-note">No animals yet — add your first red-listed animal above.</p>'}
    ${saved.length ? `<h3 class="dash-h">🎉 Happy endings (${saved.length})</h3>` + saved.map((l) => `<p class="happy-note">🎉 <strong>${l.name}</strong> was adopted / rescued — off the list and home safe!</p>`).join("") : ""}
    <div class="shelter-btn-row"><button type="button" id="dashSignOut" class="btn-ghost">Sign out</button></div>`;
  $("addAnimalBtn").addEventListener("click", () => openAnimalForm(null));
  $("dashSignOut").addEventListener("click", signOut);
  $("dashBody").querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const act = btn.getAttribute("data-act");
      if (act === "edit") openAnimalForm(id);
      else if (act === "adopted") markAdopted(id);
      else if (act === "remove") removeAnimal(id);
    });
  });
}

function markAdopted(id) {
  const l = state.listings.find((x) => x.id === id);
  if (!l) return;
  l.adopted = true; // render() hides adopted animals from the public lists
  render();
  renderDashboard(`🎉 ${l.name} is marked adopted / rescued and has come off the public list. That's what this is all for!`);
}

function removeAnimal(id) {
  [LISTINGS, state.listings].forEach((arr) => {
    const i = arr.findIndex((x) => x.id === id);
    if (i >= 0) arr.splice(i, 1);
  });
  render();
  renderDashboard("Listing removed.");
}

/* ----- Add / edit animal form ----- */

// Photo chosen in the form, as a data URL (in-memory only). Kept across
// the form's lifetime so editing without re-picking keeps the old photo.
let pendingPhoto = null;

function openAnimalForm(editId) {
  const acct = currentAccount();
  if (!acct) return;
  const form = $("animalForm");
  form.reset();
  pendingPhoto = null;
  $("aPhotoPreview").classList.add("hidden");
  $("aPhotoImg").removeAttribute("src");
  $("animalMsg").textContent = "";
  $("aId").value = "";
  $("animalTitle").textContent = "Add a red-listed animal";
  if (editId) {
    const l = state.listings.find((x) => x.id === editId);
    if (!l) return;
    $("animalTitle").textContent = `Edit ${l.name}`;
    $("aId").value = l.id;
    $("aName").value = l.name;
    $("aSpecies").value = l.species;
    $("aBreed").value = l.breed === "Breed unknown" ? "" : l.breed;
    $("aSex").value = l.sex;
    $("aAge").value = l.ageGroup;
    $("aDeadline").value = l.deadlineISO || "";
    $("aNotes").value = l.notes || "";
    if (l.photo) {
      pendingPhoto = l.photo;
      $("aPhotoImg").src = l.photo;
      $("aPhotoPreview").classList.remove("hidden");
    }
  }
  $("animalOverlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeAnimal() {
  $("animalOverlay").classList.add("hidden");
  if ($("dashOverlay").classList.contains("hidden")) document.body.style.overflow = "";
}

function handlePhotoPick(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    pendingPhoto = String(reader.result); // data URL — in-memory only
    $("aPhotoImg").src = pendingPhoto;
    $("aPhotoPreview").classList.remove("hidden");
  };
  reader.readAsDataURL(file);
}

function handleSaveAnimal(e) {
  e.preventDefault();
  const acct = currentAccount();
  if (!acct) return;
  const name = $("aName").value.trim();
  if (!name) {
    $("animalMsg").textContent = "Please give the animal a name.";
    return;
  }
  const species = $("aSpecies").value;
  const deadline = $("aDeadline").value;
  const fields = {
    name: esc(name),
    species,
    breed: esc($("aBreed").value.trim()) || "Breed unknown",
    sex: $("aSex").value,
    ageGroup: $("aAge").value,
    deadlineISO: /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : null,
    daysLeft: null,
    notes: esc($("aNotes").value.trim()) ||
      `${esc(name)} is on ${acct.shelterName}'s urgent list and is out of time. Please contact the shelter right away to adopt, foster, or rescue.`,
    photo: pendingPhoto,
    photoEmoji: SPECIES_EMOJI[species] || "🐾",
    tile: SPECIES_TILE[species] || "#ffe3b3",
  };
  const editId = $("aId").value;
  if (editId) {
    const l = state.listings.find((x) => x.id === editId);
    if (l) Object.assign(l, fields);
    closeAnimal();
    render();
    renderDashboard(`✅ ${fields.name}'s listing was updated.`);
  } else {
    const listing = {
      id: "shelter-" + Date.now(),
      ...fields,
      shelter: acct.shelterName,
      shelterId: acct.shelterId,
      city: acct.city,
      state: acct.state,
      zip: acct.zip,
      source: SHELTER_SOURCE_LABEL,
      sourceUrl: siteUrl(acct.website),
      adopted: false,
    };
    LISTINGS.push(listing);        // keep the base data in sync…
    state.listings.push(listing);  // …and the live in-memory list render() uses.
    closeAnimal();
    render();
    renderDashboard(`✅ ${fields.name} is live in the public listings, labeled “${SHELTER_SOURCE_LABEL}”.`);
  }
}

/* ---------------- Support / donations ----------------
   Two separate paths, each with preset amounts. The Donate button
   is driven entirely by DONATE_LINKS above: empty link = honest
   disabled "Donations open at launch" state; filled link = a plain
   anchor out to the Stripe Payment Link with the chosen amount in
   the label. RedList Rescue is NOT a registered nonprofit — the
   section copy in index.html says so plainly. */

const donateAmounts = { site: 25, tnr: 25 }; // currently chosen preset per path

function renderDonateAction(path) {
  const el = $(path === "site" ? "donateActionSite" : "donateActionTnr");
  if (!el) return;
  const link = path === "site" ? DONATE_LINKS.siteLink : DONATE_LINKS.tnrLink;
  if (!link) {
    el.innerHTML = `<button type="button" class="btn-primary donate-btn" disabled>Donations open at launch</button>`;
  } else {
    el.innerHTML = `<a class="btn-primary donate-btn donate-link" href="${link}" target="_blank" rel="noopener">Donate $${donateAmounts[path]} →</a>`;
  }
}

function renderSupport() {
  const recip = $("tnrRecipient");
  if (recip) recip.textContent = TNR_RECIPIENT;
  document.querySelectorAll(".donate-amount").forEach((btn) => {
    const path = btn.getAttribute("data-path");
    const amt = parseInt(btn.getAttribute("data-amount"), 10);
    btn.classList.toggle("active", donateAmounts[path] === amt);
    btn.addEventListener("click", () => {
      donateAmounts[path] = amt;
      document.querySelectorAll(`.donate-amount[data-path="${path}"]`).forEach((b) =>
        b.classList.toggle("active", parseInt(b.getAttribute("data-amount"), 10) === amt));
      renderDonateAction(path);
    });
  });
  renderDonateAction("site");
  renderDonateAction("tnr");
}

/* ---------------- Wiring ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  document.title = `${APP_NAME} — Urgent Shelter Animals Near You`;
  $("appName").textContent = APP_NAME;
  $("appNameFoot").textContent = APP_NAME;

  renderCoverage();
  renderShelterActions();
  renderSupport();

  refreshListings();

  $("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const zip = $("zipInput").value.trim();
    if (!/^\d{5}$/.test(zip)) {
      $("searchMsg").textContent = "Please enter a 5-digit ZIP code.";
      return;
    }
    $("searchMsg").textContent = "";
    state.zip = zip;
    state.origin = zipCoords(zip);
    if (!state.origin) {
      $("searchMsg").textContent =
        "We don't have map data for that ZIP yet — showing listings grouped by ZIP instead.";
    }
    refreshListings(); // re-query live sources (RescueGroups) for this ZIP
  });

  $("clearSearch").addEventListener("click", () => {
    state.zip = "";
    state.origin = null;
    $("zipInput").value = "";
    $("searchMsg").textContent = "";
    render();
  });

  document.querySelectorAll(".radius-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".radius-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.radius = parseInt(btn.getAttribute("data-radius"), 10);
      if (state.zip) refreshListings(); // widen/narrow the live radius query too
    });
  });

  document.querySelectorAll(".species-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".species-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.species = btn.getAttribute("data-species");
      render();
    });
  });

  $("detailClose").addEventListener("click", closeDetail);
  $("detailOverlay").addEventListener("click", (e) => {
    if (e.target === $("detailOverlay")) closeDetail();
  });

  $("openSubmit").addEventListener("click", openSubmit);
  $("submitClose").addEventListener("click", closeSubmit);
  $("submitOverlay").addEventListener("click", (e) => {
    if (e.target === $("submitOverlay")) closeSubmit();
  });
  $("submitForm").addEventListener("submit", handleSubmitListing);

  // Shelter accounts: auth overlay, dashboard, add/edit animal form.
  $("authClose").addEventListener("click", closeAuth);
  $("authOverlay").addEventListener("click", (e) => {
    if (e.target === $("authOverlay")) closeAuth();
  });
  $("toSignIn").addEventListener("click", () => openAuth("signin"));
  $("toSignUp").addEventListener("click", () => openAuth("signup"));
  $("signUpForm").addEventListener("submit", handleSignUp);
  $("signInForm").addEventListener("submit", handleSignIn);

  $("dashClose").addEventListener("click", closeDashboard);
  $("dashOverlay").addEventListener("click", (e) => {
    if (e.target === $("dashOverlay")) closeDashboard();
  });

  $("animalClose").addEventListener("click", closeAnimal);
  $("animalOverlay").addEventListener("click", (e) => {
    if (e.target === $("animalOverlay")) closeAnimal();
  });
  $("animalForm").addEventListener("submit", handleSaveAnimal);
  $("aPhoto").addEventListener("change", handlePhotoPick);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeDetail(); closeSubmit(); closeAuth(); closeAnimal(); closeDashboard(); }
  });
});
