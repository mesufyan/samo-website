/* ==========================================================================
   SAMO — Data layer
   Plain global (no ES modules) so the site works from file:// and any subpath.
   Everything here is placeholder content. Replace before a real launch.
   ========================================================================== */

(function (window) {
  'use strict';

  /* ----------------------------------------------------------------------
     DEMO_MODE
     true  = show illustrative counters, sample stories, generated profiles
     false = hides fabricated social proof (counters, "live now", testimonials)
     Set to false before you put real numbers on the page.
     ---------------------------------------------------------------------- */
  var DEMO_MODE = true;

  /* ----------------------------------------------------------------------
     LANGUAGES
     rtl: true  -> right-to-left script
     tier: 'eu' | 'sa' | 'mena' | 'africa' | 'asia' | 'other'  (grouping only)
     ---------------------------------------------------------------------- */
  var LANGUAGES = [
    // --- South Asia ---
    { code: 'ur', label: '🇵🇰 Urdu',        native: 'اردو',        rtl: true,  tier: 'sa' },
    { code: 'pa', label: '🇵🇰 Punjabi',     native: 'پنجابی',      rtl: true,  tier: 'sa' },
    { code: 'ps', label: '🇦🇫 Pashto',      native: 'پښتو',        rtl: true,  tier: 'sa' },
    { code: 'sd', label: '🇵🇰 Sindhi',      native: 'سنڌي',        rtl: true,  tier: 'sa' },
    { code: 'bal', label: '🇵🇰 Balochi',    native: 'بلوچی',       rtl: true,  tier: 'sa' },
    { code: 'skr', label: '🇵🇰 Saraiki',    native: 'سرائیکی',     rtl: true,  tier: 'sa' },
    { code: 'hi', label: '🇮🇳 Hindi',       native: 'हिन्दी',       rtl: false, tier: 'sa' },
    { code: 'bn', label: '🇧🇩 Bengali',     native: 'বাংলা',        rtl: false, tier: 'sa' },
    { code: 'ta', label: '🇮🇳 Tamil',       native: 'தமிழ்',       rtl: false, tier: 'sa' },
    { code: 'te', label: '🇮🇳 Telugu',      native: 'తెలుగు',       rtl: false, tier: 'sa' },
    { code: 'ml', label: '🇮🇳 Malayalam',   native: 'മലയാളം',      rtl: false, tier: 'sa' },
    { code: 'gu', label: '🇮🇳 Gujarati',    native: 'ગુજરાતી',      rtl: false, tier: 'sa' },
    { code: 'mr', label: '🇮🇳 Marathi',     native: 'मराठी',        rtl: false, tier: 'sa' },
    { code: 'ne', label: '🇳🇵 Nepali',      native: 'नेपाली',        rtl: false, tier: 'sa' },
    { code: 'si', label: '🇱🇰 Sinhala',     native: 'සිංහල',       rtl: false, tier: 'sa' },

    // --- Middle East, Central Asia & North Africa ---
    { code: 'ar', label: '🇸🇦 Arabic',      native: 'العربية',      rtl: true,  tier: 'mena' },
    { code: 'fa', label: '🇮🇷 Persian',     native: 'فارسی',        rtl: true,  tier: 'mena' },
    { code: 'prs', label: '🇦🇫 Dari',       native: 'دری',          rtl: true,  tier: 'mena' },
    { code: 'ku', label: '🏴 Kurdish',      native: 'کوردی',        rtl: true,  tier: 'mena' },
    { code: 'he', label: '🇮🇱 Hebrew',      native: 'עברית',        rtl: true,  tier: 'mena' },
    { code: 'tr', label: '🇹🇷 Turkish',     native: 'Türkçe',       rtl: false, tier: 'mena' },
    { code: 'az', label: '🇦🇿 Azerbaijani', native: 'Azərbaycanca', rtl: false, tier: 'mena' },
    { code: 'uz', label: '🇺🇿 Uzbek',       native: "O'zbekcha",    rtl: false, tier: 'mena' },
    { code: 'kk', label: '🇰🇿 Kazakh',      native: 'Қазақша',      rtl: false, tier: 'mena' },
    { code: 'hy', label: '🇦🇲 Armenian',    native: 'Հայերեն',      rtl: false, tier: 'mena' },
    { code: 'ka', label: '🇬🇪 Georgian',    native: 'ქართული',      rtl: false, tier: 'mena' },

    // --- Africa ---
    { code: 'so', label: '🇸🇴 Somali',      native: 'Soomaali',     rtl: false, tier: 'africa' },
    { code: 'am', label: '🇪🇹 Amharic',     native: 'አማርኛ',        rtl: false, tier: 'africa' },
    { code: 'ti', label: '🇪🇷 Tigrinya',    native: 'ትግርኛ',        rtl: false, tier: 'africa' },
    { code: 'sw', label: '🇰🇪 Swahili',     native: 'Kiswahili',    rtl: false, tier: 'africa' },
    { code: 'yo', label: '🇳🇬 Yoruba',      native: 'Yorùbá',       rtl: false, tier: 'africa' },
    { code: 'ha', label: '🇳🇬 Hausa',       native: 'Hausa',        rtl: false, tier: 'africa' },
    { code: 'ig', label: '🇳🇬 Igbo',        native: 'Igbo',         rtl: false, tier: 'africa' },

    // --- East & Southeast Asia ---
    { code: 'zh', label: '🇨🇳 Mandarin',    native: '中文',          rtl: false, tier: 'asia' },
    { code: 'vi', label: '🇻🇳 Vietnamese',  native: 'Tiếng Việt',   rtl: false, tier: 'asia' },
    { code: 'tl', label: '🇵🇭 Filipino',    native: 'Filipino',     rtl: false, tier: 'asia' },
    { code: 'id', label: '🇮🇩 Indonesian',  native: 'Indonesia',    rtl: false, tier: 'asia' },
    { code: 'th', label: '🇹🇭 Thai',        native: 'ไทย',          rtl: false, tier: 'asia' },
    { code: 'ko', label: '🇰🇷 Korean',      native: '한국어',        rtl: false, tier: 'asia' },
    { code: 'ja', label: '🇯🇵 Japanese',    native: '日本語',        rtl: false, tier: 'asia' },

    // --- Europe & Latin America ---
    { code: 'en', label: '🇬🇧 English',     native: 'English',      rtl: false, tier: 'eu' },
    { code: 'es', label: '🇪🇸 Spanish',     native: 'Español',      rtl: false, tier: 'eu' },
    { code: 'de', label: '🇩🇪 German',      native: 'Deutsch',      rtl: false, tier: 'eu' },
    { code: 'fr', label: '🇫🇷 French',      native: 'Français',     rtl: false, tier: 'eu' },
    { code: 'it', label: '🇮🇹 Italian',     native: 'Italiano',     rtl: false, tier: 'eu' },
    { code: 'pt', label: '🇵🇹 Portuguese',  native: 'Português',    rtl: false, tier: 'eu' },
    { code: 'nl', label: '🇳🇱 Dutch',       native: 'Nederlands',   rtl: false, tier: 'eu' },
    { code: 'pl', label: '🇵🇱 Polish',      native: 'Polski',       rtl: false, tier: 'eu' },
    { code: 'ro', label: '🇷🇴 Romanian',    native: 'Română',       rtl: false, tier: 'eu' },
    { code: 'uk', label: '🇺🇦 Ukrainian',   native: 'Українська',   rtl: false, tier: 'eu' },
    { code: 'ru', label: '🇷🇺 Russian',     native: 'Русский',      rtl: false, tier: 'eu' },
    { code: 'sq', label: '🇦🇱 Albanian',    native: 'Shqip',        rtl: false, tier: 'eu' },
    { code: 'sr', label: '🇷🇸 Serbian',     native: 'Српски',       rtl: false, tier: 'eu' },
    { code: 'hr', label: '🇭🇷 Croatian',    native: 'Hrvatski',     rtl: false, tier: 'eu' },
    { code: 'bg', label: '🇧🇬 Bulgarian',   native: 'Български',    rtl: false, tier: 'eu' },
    { code: 'el', label: '🇬🇷 Greek',       native: 'Ελληνικά',     rtl: false, tier: 'eu' },
    { code: 'hu', label: '🇭🇺 Hungarian',   native: 'Magyar',       rtl: false, tier: 'eu' },
    { code: 'cs', label: '🇨🇿 Czech',       native: 'Čeština',      rtl: false, tier: 'eu' },
    { code: 'sv', label: '🇸🇪 Swedish',     native: 'Svenska',      rtl: false, tier: 'eu' }
  ];

  var TIER_LABELS = {
    sa: 'South Asia',
    mena: 'Middle East & Central Asia',
    africa: 'Africa',
    asia: 'East & Southeast Asia',
    eu: 'Europe & Latin America'
  };

  /* ----------------------------------------------------------------------
     CITIES
     ---------------------------------------------------------------------- */
  var CITIES = [
    { code: 'berlin',     label: '🇩🇪 Berlin',     district: 'Mitte',          lat: 52.52, lng: 13.40 },
    { code: 'munich',     label: '🇩🇪 Munich',     district: 'Maxvorstadt',    lat: 48.13, lng: 11.58 },
    { code: 'hamburg',    label: '🇩🇪 Hamburg',    district: 'St. Pauli',      lat: 53.55, lng: 9.99 },
    { code: 'frankfurt',  label: '🇩🇪 Frankfurt',  district: 'Bockenheim',     lat: 50.11, lng: 8.68 },
    { code: 'paris',      label: '🇫🇷 Paris',      district: '11e',            lat: 48.85, lng: 2.35 },
    { code: 'lyon',       label: '🇫🇷 Lyon',       district: 'Part-Dieu',      lat: 45.76, lng: 4.83 },
    { code: 'caen',       label: '🇫🇷 Caen',       district: 'Centre',         lat: 49.18, lng: -0.37 },
    { code: 'madrid',     label: '🇪🇸 Madrid',     district: 'Lavapiés',       lat: 40.41, lng: -3.70 },
    { code: 'barcelona',  label: '🇪🇸 Barcelona',  district: 'El Raval',       lat: 41.38, lng: 2.17 },
    { code: 'seville',    label: '🇪🇸 Seville',    district: 'Triana',         lat: 37.39, lng: -5.99 },
    { code: 'milan',      label: '🇮🇹 Milan',      district: 'Navigli',        lat: 45.46, lng: 9.19 },
    { code: 'rome',       label: '🇮🇹 Rome',       district: 'Pigneto',        lat: 41.90, lng: 12.49 },
    { code: 'catania',    label: '🇮🇹 Catania',    district: 'Centro',         lat: 37.50, lng: 15.09 },
    { code: 'vienna',     label: '🇦🇹 Vienna',     district: 'Leopoldstadt',   lat: 48.20, lng: 16.37 },
    { code: 'amsterdam',  label: '🇳🇱 Amsterdam',  district: 'De Pijp',        lat: 52.37, lng: 4.90 },
    { code: 'brussels',   label: '🇧🇪 Brussels',   district: 'Ixelles',        lat: 50.85, lng: 4.35 },
    { code: 'lisbon',     label: '🇵🇹 Lisbon',     district: 'Arroios',        lat: 38.72, lng: -9.14 },
    { code: 'stockholm',  label: '🇸🇪 Stockholm',  district: 'Södermalm',      lat: 59.33, lng: 18.07 },
    { code: 'copenhagen', label: '🇩🇰 Copenhagen', district: 'Nørrebro',       lat: 55.68, lng: 12.57 },
    { code: 'dublin',     label: '🇮🇪 Dublin',     district: 'Rathmines',      lat: 53.35, lng: -6.26 },
    { code: 'warsaw',     label: '🇵🇱 Warsaw',     district: 'Praga',          lat: 52.23, lng: 21.01 },
    { code: 'zurich',     label: '🇨🇭 Zurich',     district: 'Kreis 4',        lat: 47.38, lng: 8.54 }
  ];

  /* ----------------------------------------------------------------------
     NAME BANKS — used by the demo generator so profiles feel plausible
     ---------------------------------------------------------------------- */
  var NAMES = {
    ur:  ['Ayesha', 'Bilal', 'Zainab', 'Hamza', 'Mahnoor', 'Usman', 'Fatima', 'Talha'],
    pa:  ['Simran', 'Harpreet', 'Gurdeep', 'Amrita', 'Jasleen', 'Ravinder', 'Manpreet', 'Baljit'],
    ps:  ['Wali', 'Shabana', 'Zarmina', 'Naveed', 'Gulalai', 'Asfandyar', 'Palwasha', 'Rahim'],
    sd:  ['Sanam', 'Imdad', 'Rukhsana', 'Ghulam', 'Sassui', 'Allah Dino', 'Marvi', 'Jamshed'],
    bal: ['Hani', 'Chakar', 'Banul', 'Yousaf', 'Gohar', 'Nawab', 'Sameena', 'Baloch'],
    skr: ['Nazia', 'Riaz', 'Shehzad', 'Rubina', 'Iqbal', 'Sughra', 'Aslam', 'Kausar'],
    hi:  ['Priya', 'Rohit', 'Ananya', 'Vikram', 'Neha', 'Arjun', 'Kavita', 'Siddharth'],
    bn:  ['Rumi', 'Tanvir', 'Shreya', 'Arif', 'Nusrat', 'Rafi', 'Moushumi', 'Sabbir'],
    ta:  ['Divya', 'Karthik', 'Meena', 'Suresh', 'Lakshmi', 'Arun', 'Bhavana', 'Vignesh'],
    te:  ['Sravani', 'Kiran', 'Padma', 'Naveen', 'Anitha', 'Ravi', 'Swathi', 'Mahesh'],
    ml:  ['Anju', 'Nithin', 'Reshma', 'Vishnu', 'Devika', 'Sarath', 'Ammu', 'Jithin'],
    gu:  ['Hetal', 'Nirav', 'Krupa', 'Jignesh', 'Bhavika', 'Chirag', 'Rina', 'Parth'],
    mr:  ['Sneha', 'Omkar', 'Manasi', 'Sagar', 'Aarti', 'Nikhil', 'Pooja', 'Tejas'],
    ne:  ['Sunita', 'Bikash', 'Anjana', 'Prakash', 'Sarita', 'Nabin', 'Puja', 'Ramesh'],
    si:  ['Nadeesha', 'Kasun', 'Ishara', 'Tharindu', 'Dilani', 'Sanjaya', 'Hiruni', 'Chamara'],
    ar:  ['Layla', 'Omar', 'Nour', 'Karim', 'Salma', 'Youssef', 'Rania', 'Tarek'],
    fa:  ['Sara', 'Reza', 'Niloofar', 'Amir', 'Parisa', 'Kaveh', 'Shirin', 'Behnam'],
    prs: ['Farida', 'Ahmad', 'Zahra', 'Mustafa', 'Nargis', 'Habib', 'Marwa', 'Sayed'],
    ku:  ['Rojin', 'Diyar', 'Berivan', 'Azad', 'Helin', 'Shivan', 'Nujin', 'Kawa'],
    he:  ['Noa', 'Itai', 'Maya', 'Yonatan', 'Shira', 'Amit', 'Tamar', 'Eitan'],
    tr:  ['Elif', 'Mert', 'Zeynep', 'Emre', 'Selin', 'Burak', 'Deniz', 'Kaan'],
    az:  ['Leyla', 'Elvin', 'Gunel', 'Rashad', 'Aysel', 'Tural', 'Nigar', 'Orkhan'],
    uz:  ['Dilnoza', 'Jasur', 'Malika', 'Sardor', 'Nilufar', 'Bekzod', 'Zilola', 'Otabek'],
    kk:  ['Aigerim', 'Nurlan', 'Dana', 'Yerlan', 'Aliya', 'Timur', 'Madina', 'Askar'],
    hy:  ['Anahit', 'Vahe', 'Lusine', 'Aram', 'Mariam', 'Tigran', 'Nare', 'Davit'],
    ka:  ['Nino', 'Giorgi', 'Tamar', 'Levan', 'Ana', 'Irakli', 'Salome', 'Nika'],
    so:  ['Hodan', 'Abdi', 'Ayaan', 'Farah', 'Deqa', 'Yusuf', 'Ifrah', 'Hassan'],
    am:  ['Selam', 'Dawit', 'Hanna', 'Yohannes', 'Meron', 'Abel', 'Bethel', 'Kalkidan'],
    ti:  ['Rahel', 'Tesfay', 'Semhar', 'Fitsum', 'Winta', 'Yonas', 'Almaz', 'Mehari'],
    sw:  ['Amani', 'Juma', 'Zawadi', 'Baraka', 'Neema', 'Tumaini', 'Imani', 'Salim'],
    yo:  ['Adaeze', 'Tunde', 'Folake', 'Segun', 'Yemi', 'Bola', 'Kemi', 'Femi'],
    ha:  ['Amina', 'Sani', 'Hauwa', 'Musa', 'Zainab', 'Aliyu', 'Fatima', 'Ibrahim'],
    ig:  ['Chiamaka', 'Emeka', 'Ngozi', 'Obinna', 'Adaobi', 'Chidi', 'Ifeoma', 'Uche'],
    zh:  ['Wei', 'Ling', 'Hao', 'Mei', 'Jun', 'Xin', 'Yan', 'Chen'],
    vi:  ['Linh', 'Minh', 'Trang', 'Duc', 'Mai', 'Hieu', 'Thao', 'Nam'],
    tl:  ['Andrea', 'Mark', 'Jasmine', 'Paolo', 'Kristine', 'Rico', 'Angel', 'Miguel'],
    id:  ['Putri', 'Bagus', 'Dewi', 'Rizky', 'Sari', 'Andi', 'Intan', 'Yoga'],
    th:  ['Ploy', 'Nat', 'Fah', 'Chai', 'Mint', 'Ton', 'Bee', 'Kwan'],
    ko:  ['Jiwoo', 'Minjun', 'Seoyeon', 'Hyun', 'Yuna', 'Doyun', 'Haeun', 'Jisung'],
    ja:  ['Yuki', 'Haruto', 'Aoi', 'Sota', 'Mei', 'Ren', 'Hana', 'Kenta'],
    en:  ['Emma', 'Jack', 'Olivia', 'Liam', 'Sophie', 'Ryan', 'Chloe', 'Ethan'],
    es:  ['Lucía', 'Carlos', 'Sofía', 'Miguel', 'Elena', 'Javier', 'Paula', 'Diego'],
    de:  ['Lena', 'Jonas', 'Mia', 'Felix', 'Hannah', 'Lukas', 'Emilia', 'Niklas'],
    fr:  ['Camille', 'Julien', 'Chloé', 'Antoine', 'Manon', 'Hugo', 'Léa', 'Maxime'],
    it:  ['Giulia', 'Marco', 'Chiara', 'Luca', 'Sara', 'Matteo', 'Elisa', 'Andrea'],
    pt:  ['Beatriz', 'Tiago', 'Inês', 'Rui', 'Mariana', 'Pedro', 'Carolina', 'João'],
    nl:  ['Sanne', 'Daan', 'Fleur', 'Bram', 'Lotte', 'Sem', 'Anouk', 'Thijs'],
    pl:  ['Zofia', 'Kacper', 'Julia', 'Piotr', 'Ola', 'Marek', 'Ania', 'Tomasz'],
    ro:  ['Ioana', 'Andrei', 'Elena', 'Mihai', 'Ana', 'Radu', 'Maria', 'Vlad'],
    uk:  ['Oksana', 'Dmytro', 'Kateryna', 'Andriy', 'Olena', 'Taras', 'Iryna', 'Serhii'],
    ru:  ['Anna', 'Ivan', 'Daria', 'Mikhail', 'Olga', 'Pavel', 'Ekaterina', 'Sergei'],
    sq:  ['Arta', 'Ermal', 'Blerta', 'Gent', 'Elira', 'Dritan', 'Vjosa', 'Alban'],
    sr:  ['Milica', 'Nikola', 'Jelena', 'Stefan', 'Ana', 'Marko', 'Ivana', 'Luka'],
    hr:  ['Ivana', 'Ante', 'Petra', 'Josip', 'Marija', 'Ivan', 'Lucija', 'Tomislav'],
    bg:  ['Elena', 'Georgi', 'Maria', 'Dimitar', 'Nadia', 'Ivan', 'Petya', 'Stoyan'],
    el:  ['Eleni', 'Nikos', 'Maria', 'Giorgos', 'Sofia', 'Dimitris', 'Katerina', 'Yannis'],
    hu:  ['Eszter', 'Bence', 'Anna', 'Máté', 'Réka', 'Ádám', 'Luca', 'Dávid'],
    cs:  ['Tereza', 'Jakub', 'Eliška', 'Petr', 'Anna', 'Tomáš', 'Klára', 'Martin'],
    sv:  ['Elsa', 'Oskar', 'Alva', 'Erik', 'Maja', 'Axel', 'Ebba', 'Nils']
  };

  var FALLBACK_NAMES = ['Alex', 'Sam', 'Noor', 'Robin', 'Jo', 'Kim', 'Nadia', 'Ari'];

  /* Occupations and interests used to compose short bios */
  var ROLES = [
    'PhD student', 'Nurse', 'Software engineer', 'Barista', 'Architect', 'Researcher',
    'Delivery rider', 'Teacher', 'Chef', 'Physiotherapist', 'Accountant', 'Bus driver',
    'Data analyst', 'Midwife', 'Electrician', 'Graphic designer', 'Pharmacist', 'Au pair',
    'Lab technician', 'Warehouse supervisor', 'Translator', 'Dentist', 'Musician'
  ];

  var TENURE = [
    'new this month', '3 months here', '1 year here', '2 years here', '5 years here',
    'arrived in spring', 'moved for work', 'here on a study visa', 'here with family'
  ];

  var STATUSES = [
    { icon: '☕', text: 'Free for coffee', coffee: true },
    { icon: '🚶', text: 'Walking home', coffee: false },
    { icon: '🍲', text: 'Cooking tonight', coffee: true },
    { icon: '📚', text: 'Language exchange', coffee: false },
    { icon: '🏏', text: 'Weekend cricket', coffee: false },
    { icon: '🕌', text: 'Heading to prayer', coffee: false },
    { icon: '🛒', text: 'Groceries run', coffee: false },
    { icon: '💻', text: 'Working from a café', coffee: true },
    { icon: '🎬', text: 'Film night', coffee: false },
    { icon: '⚽', text: 'Watching the match', coffee: true },
    { icon: '🧳', text: 'Just landed', coffee: true },
    { icon: '🎒', text: 'Between classes', coffee: true }
  ];

  /* ----------------------------------------------------------------------
     FEATURES
     ---------------------------------------------------------------------- */
  var FEATURES = [
    {
      icon: 'globe',
      title: 'Filter by mother tongue, not nationality',
      body: 'A Punjabi speaker from Lahore and one from Amritsar want the same conversation. SAMO matches on the language you dream in, then on distance.'
    },
    {
      icon: 'pin',
      title: 'Walking distance, not "somewhere in the city"',
      body: 'Results are ranked by how far you would actually walk. Under 300 m, under 1 km, under 3 km. Your exact location is never shown to anyone.'
    },
    {
      icon: 'coffee',
      title: 'Coffee Mode: two hours, then it switches off',
      body: 'Turn it on when you are actually free. Everyone else in Coffee Mode near you sees a green ring. No planning threads that die after four messages.'
    },
    {
      icon: 'shield',
      title: 'Verified people, public places',
      body: 'ID plus a live selfie to join. First meetups are suggested at cafés, libraries and parks that other members have already used.'
    },
    {
      icon: 'script',
      title: 'Reads right to left when it should',
      body: 'Urdu, Pashto, Arabic, Farsi, Hebrew and Kurdish get a proper RTL interface, not English with a translated label glued on.'
    },
    {
      icon: 'lock',
      title: 'No ads, no data sale',
      body: 'The app is paid because the alternative is selling your location graph. Location is stored coarse and encrypted, and you can wipe it in one tap.'
    }
  ];

  /* ----------------------------------------------------------------------
     PRICING
     ---------------------------------------------------------------------- */
  var PRICING = [
    {
      id: 'free',
      name: 'Neighbour',
      monthly: 0,
      yearly: 0,
      tagline: 'Enough to find out if your people are here.',
      features: [
        '5 nearby profiles a day',
        '1 language filter',
        'Coffee Mode twice a week',
        'Community events feed',
        'Verified badge'
      ],
      cta: 'Start free',
      featured: false
    },
    {
      id: 'local',
      name: 'Local',
      monthly: 4.9,
      yearly: 39,
      tagline: 'For people who actually want to meet this week.',
      features: [
        'Unlimited nearby profiles',
        'Up to 4 language filters',
        'Coffee Mode always on',
        'See who viewed you',
        'Priority in search results',
        'Host your own meetups'
      ],
      cta: 'Choose Local',
      featured: true
    },
    {
      id: 'anchor',
      name: 'Anchor',
      monthly: 9.9,
      yearly: 79,
      tagline: 'For community organisers and new arrivals who need a lot, fast.',
      features: [
        'Everything in Local',
        'Multi-city access',
        'Newcomer concierge (first 30 days)',
        'Create verified community groups',
        'Event promotion tools',
        'Support in your language'
      ],
      cta: 'Choose Anchor',
      featured: false
    }
  ];

  /* ----------------------------------------------------------------------
     TESTIMONIALS — placeholder copy. Replace with real, consented quotes.
     ---------------------------------------------------------------------- */
  var TESTIMONIALS = [
    {
      quote: 'I spent eight months in Frankfurt speaking only work English. The first time someone answered me in Punjabi at a bakery two streets away, I nearly cried.',
      name: 'Harpreet',
      role: 'Warehouse supervisor, Frankfurt',
      lang: '🇵🇰 Punjabi'
    },
    {
      quote: 'My mother visited for three months and had nobody to talk to. She found four Urdu-speaking women in our district and now they walk together every morning.',
      name: 'Ayesha',
      role: 'PhD student, Caen',
      lang: '🇵🇰 Urdu'
    },
    {
      quote: 'Coffee Mode is the part that works. You are free right now, so am I, we meet in twenty minutes. No three-day scheduling conversation.',
      name: 'Wali',
      role: 'Electrician, Vienna',
      lang: '🇦🇫 Pashto'
    },
    {
      quote: 'I moved to Milan for a hospital post and knew nobody. Two Malayalam speakers on the same shift pattern, found in one evening.',
      name: 'Anju',
      role: 'Nurse, Milan',
      lang: '🇮🇳 Malayalam'
    },
    {
      quote: 'The RTL interface matters more than people think. Everything else asks me to read my own language backwards.',
      name: 'Layla',
      role: 'Translator, Brussels',
      lang: '🇸🇦 Arabic'
    },
    {
      quote: 'I run a Somali women\'s group in Stockholm. We stopped using group chats entirely. Everyone just turns on Coffee Mode on Saturdays.',
      name: 'Hodan',
      role: 'Community organiser, Stockholm',
      lang: '🇸🇴 Somali'
    }
  ];

  /* ----------------------------------------------------------------------
     FAQ
     ---------------------------------------------------------------------- */
  var FAQ = [
    {
      q: 'Is this a dating app?',
      a: 'No. There is no swiping and no romantic matching. SAMO is built for the specific problem of not having anyone nearby who speaks your language. You can set your profile to same-gender-only visibility if you prefer, and many members do.'
    },
    {
      q: 'Can people see exactly where I am?',
      a: 'Never. Your position is fuzzed to a 150 m grid cell before it leaves your phone, and other members only see a distance band such as "under 500 m". You can go invisible at any time, and pausing your account deletes your stored location within 24 hours.'
    },
    {
      q: 'What if my language is not listed?',
      a: 'Tell us in the waitlist form and we will add it. The list already covers 59 languages including Urdu, Punjabi, Pashto, Sindhi, Balochi, Saraiki, Dari, Kurdish, Tigrinya and Hausa. Adding a language is a data entry job for us, not an engineering one.'
    },
    {
      q: 'How do you stop harassment?',
      a: 'Three things. Everyone verifies with ID plus a live selfie before they can appear in results. Reports are reviewed by a moderator who reads the language of the conversation. A blocked member disappears from your results permanently and cannot see you again, on any account tied to that ID.'
    },
    {
      q: 'Why is it paid?',
      a: 'Because the only way to run a free location app is to sell the location data, and that is the thing we would most like not to do. A Local subscription costs about the same as one coffee a month.'
    },
    {
      q: 'Do I have to meet strangers?',
      a: 'No. Plenty of members only use the events feed or the language groups. Meeting one to one is opt-in, and suggested venues are public places that other members have already met at.'
    },
    {
      q: 'Which cities are live?',
      a: 'The waitlist is open everywhere in Europe. We open a city once about 300 people from at least three language communities have signed up there, so that the map is not empty on day one.'
    },
    {
      q: 'What happens to my data if I leave?',
      a: 'Delete your account and profile data, messages and location history are erased within 30 days, with no shadow copy. You can export everything as JSON first.'
    }
  ];

  /* ----------------------------------------------------------------------
     UI STRINGS — small i18n set for the hero and CTA
     ---------------------------------------------------------------------- */
  var UI = {
    en: { tagline: 'Find your language. Find your people.', cta: 'Find my people' },
    ur: { tagline: 'اپنی زبان ڈھونڈیں۔ اپنے لوگ ڈھونڈیں۔', cta: 'میرے لوگ تلاش کریں' },
    pa: { tagline: 'آپݨی بولی لبھو۔ آپݨے لوک لبھو۔', cta: 'میرے لوک لبھو' },
    ps: { tagline: 'خپله ژبه ومومئ. خپل خلک ومومئ.', cta: 'زما خلک ومومه' },
    ar: { tagline: 'اعثر على لغتك. اعثر على أهلك.', cta: 'اعثر على أهلي' },
    fa: { tagline: 'زبانت را پیدا کن. مردمت را پیدا کن.', cta: 'مردم من را پیدا کن' },
    hi: { tagline: 'अपनी भाषा खोजें। अपने लोग खोजें।', cta: 'मेरे लोग खोजें' },
    bn: { tagline: 'আপনার ভাষা খুঁজুন। আপনার মানুষ খুঁজুন।', cta: 'আমার মানুষ খুঁজুন' },
    tr: { tagline: 'Dilini bul. İnsanlarını bul.', cta: 'İnsanlarımı bul' },
    es: { tagline: 'Encuentra tu idioma. Encuentra a tu gente.', cta: 'Encontrar a mi gente' },
    fr: { tagline: 'Trouvez votre langue. Trouvez les vôtres.', cta: 'Trouver mes proches' },
    de: { tagline: 'Finde deine Sprache. Finde deine Leute.', cta: 'Meine Leute finden' },
    it: { tagline: 'Trova la tua lingua. Trova la tua gente.', cta: 'Trova la mia gente' },
    pl: { tagline: 'Znajdź swój język. Znajdź swoich ludzi.', cta: 'Znajdź moich ludzi' },
    so: { tagline: 'Hel luqaddaada. Hel dadkaaga.', cta: 'Hel dadkayga' }
  };

  /* ----------------------------------------------------------------------
     Deterministic pseudo-random generator
     Same language + city always produces the same demo people, so the page
     does not reshuffle on every render.
     ---------------------------------------------------------------------- */
  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;  s >>>= 0;
      return s / 4294967296;
    };
  }

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length) % arr.length];
  }

  function formatDistance(metres) {
    if (metres < 1000) return Math.round(metres / 10) * 10 + ' m';
    return (metres / 1000).toFixed(1) + ' km';
  }

  /**
   * getMatches(langCode, cityCode, count)
   * Returns an array of demo profiles, sorted by distance.
   */
  function getMatches(langCode, cityCode, count) {
    count = count || 4;
    var rng = makeRng(hashString(langCode + '|' + cityCode));
    var pool = NAMES[langCode] || FALLBACK_NAMES;
    var used = {};
    var out = [];

    for (var i = 0; i < count; i++) {
      var name = pick(rng, pool);
      var guard = 0;
      while (used[name] && guard < 12) { name = pick(rng, pool); guard++; }
      used[name] = true;

      var status = pick(rng, STATUSES);
      var metres = Math.round(70 + Math.pow(rng(), 1.9) * 2900);

      out.push({
        id: langCode + '-' + cityCode + '-' + i,
        name: name,
        initials: name.slice(0, 1).toUpperCase(),
        metres: metres,
        dist: formatDistance(metres),
        role: pick(rng, ROLES),
        tenure: pick(rng, TENURE),
        status: status.icon + ' ' + status.text,
        coffee: status.coffee,
        verified: rng() > 0.25,
        // map placement, kept inside 12%–88% so pins never clip the frame
        x: 12 + rng() * 76,
        y: 12 + rng() * 76
      });
    }

    return out.sort(function (a, b) { return a.metres - b.metres; });
  }

  /** Rough, stable "people nearby" figure for a language/city pair. */
  function estimateNearby(langCode, cityCode) {
    var rng = makeRng(hashString('count|' + langCode + '|' + cityCode));
    return 40 + Math.floor(rng() * 900);
  }

  function getLanguage(code) {
    for (var i = 0; i < LANGUAGES.length; i++) {
      if (LANGUAGES[i].code === code) return LANGUAGES[i];
    }
    return LANGUAGES[0];
  }

  function getCity(code) {
    for (var i = 0; i < CITIES.length; i++) {
      if (CITIES[i].code === code) return CITIES[i];
    }
    return CITIES[0];
  }

  window.SAMO = {
    DEMO_MODE: DEMO_MODE,
    LANGUAGES: LANGUAGES,
    TIER_LABELS: TIER_LABELS,
    CITIES: CITIES,
    NAMES: NAMES,
    ROLES: ROLES,
    STATUSES: STATUSES,
    FEATURES: FEATURES,
    PRICING: PRICING,
    TESTIMONIALS: TESTIMONIALS,
    FAQ: FAQ,
    UI: UI,
    getMatches: getMatches,
    estimateNearby: estimateNearby,
    getLanguage: getLanguage,
    getCity: getCity,
    formatDistance: formatDistance
  };
})(window);
