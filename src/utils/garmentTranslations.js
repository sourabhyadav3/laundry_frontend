import { translations } from '../context/translations';

// Common garment names → Arabic (for custom catalog items typed in English)
export const GARMENT_NAME_MAP = {
  kurta: 'كُرتا',
  kurti: 'كُرتي',
  sher: 'شير',
  sherwani: 'شيرواني',
  shervani: 'شيرواني',
  abaya: 'عباية',
  abayas: 'عباية',
  burqa: 'برقع',
  niqab: 'نقاب',
  saree: 'ساري',
  sari: 'ساري',
  dupatta: 'دوپتہ',
  scarf: 'وشاح',
  stole: 'شال',
  pant: 'بنطلون',
  pants: 'بنطلون',
  trouser: 'بنطلون',
  trousers: 'بنطلون',
  jean: 'جينز',
  jeans: 'جينز',
  shorts: 'شورت',
  suit: 'بدلة',
  blazer: 'بليزر',
  coat: 'معطف',
  jacket: 'جاكيت',
  bathrobe: 'روب استحمام',
  robe: 'روب',
  hoodie: 'هودي',
  dress: 'فستان',
  frock: 'فستان',
  gown: 'ثوب',
  lehenga: 'لهينغا',
  skirt: 'تنورة',
  blouse: 'بلوزة',
  top: 'بلوزة',
  sweater: 'سترة',
  pullover: 'بلوفر',
  underwear: 'ملابس داخلية',
  innerwear: 'ملابس داخلية',
  bra: 'حمالة صدر',
  swimsuit: 'مايوه',
  bikini: 'بيكيني',
  socks: 'جوارب',
  sock: 'جورب',
  gloves: 'قفازات',
  glove: 'قفاز',
  cap: 'كاب',
  hat: 'قبعة',
  topi: 'طاقية',
  shoes: 'أحذية',
  shoe: 'حذاء',
  boots: 'أحذية',
  sandal: 'صندل',
  chappal: 'شبشب',
  bag: 'حقيبة',
  purse: 'محفظة',
  tie: 'ربطة عنق',
  bowtie: 'ربطة عنق',
  vest: 'صديري',
  waistcoat: 'صديري',
  shirt: 'قميص',
  tshirt: 'تي شيرت',
  't-shirt': 'تي شيرت',
  blanket: 'بطانية',
  bedsheet: 'شرشف',
  carpet: 'سجاد',
  curtain: 'ستارة',
  thobe: 'ثوب',
  dishdasha: 'دشداشة',
  ghutra: 'غترة',
  ghotraa: 'غترة',
  shmage: 'شماغ',
  bisht: 'بشت',
  hijab: 'حجاب',
  hegab: 'حجاب',
  bluse: 'بلوزة',
  sajjad: 'سجاد',
  bataniya: 'بطانية',
  sharashif: 'شراشف',
  handkerchief: 'منديل جيب',
  hankie: 'منديل جيب',
  towel: 'منشفة',
  pillowcase: 'غطاء مخدة',
  pillow: 'مخدة',
  rug: 'سجاد',
  mat: 'سجادة',
  kaftan: 'قفطان',
  jalabiya: 'جلابية',
  overalls: 'أوفرول',
  uniform: 'زي موحد',
  'military suit': 'بدلة عسكرية',
  'military': 'عسكري',
  'dishdasha summer': 'دشداشة صيفي',
  'dishdasha winter': 'دشداشة شتوي',
  'deshdasha summer': 'دشداشة صيفي',
  'deshdasha winter': 'دشداشة شتوي',
  'deshdasha': 'دشداشة',
  'deshdash': 'دشداشة',
  'dishdash': 'دشداشة',
};

export const translateGarmentName = (name) => {
  if (!name || typeof name !== 'string') return null;
  const key = name.trim().toLowerCase();
  if (GARMENT_NAME_MAP[key]) return GARMENT_NAME_MAP[key];

  // Try checking sub-phrases or combinations (e.g. "military suit")
  const keys = Object.keys(GARMENT_NAME_MAP);
  for (const k of keys) {
    if (k.includes(' ') && key.includes(k)) {
      const hasExtraSize = ['small', 'large', 'big', 'single', 'double'].some(
        sz => key.includes(sz) && !k.includes(sz)
      );
      if (!hasExtraSize) {
        return GARMENT_NAME_MAP[k];
      }
    }
  }

  // Smart grammatical translation parser
  const NOUN_MAP = {
    dishdasha: 'دشداشة',
    deshdasha: 'دشداشة',
    dishdash: 'دشداشة',
    deshdash: 'دشداشة',
    blouse: 'بلوزة',
    bluse: 'بلوزة',
    trousers: 'بنطلون',
    trouser: 'بنطلون',
    pants: 'بنطلون',
    pant: 'بنطلون',
    jeans: 'جينز',
    jean: 'جينز',
    shirt: 'قميص',
    tshirt: 'تي شيرت',
    't-shirt': 'تي شيرت',
    jacket: 'جاكيت',
    bathrobe: 'روب استحمام',
    robe: 'روب',
    coat: 'معطف',
    suit: 'بدلة',
    carpet: 'سجاد',
    sajjad: 'سجاد',
    quilt: 'لحاف',
    blanket: 'بطانية',
    bataniya: 'بطانية',
    sheet: 'شرشف',
    bedsheet: 'شرشف',
    sharashif: 'شراشف',
    skirt: 'تنورة',
    dress: 'فستان',
    abaya: 'عباية',
    hegab: 'حجاب',
    hijab: 'حجاب',
    ghutra: 'غترة',
    ghotraa: 'غترة',
    shmage: 'شماغ',
    bisht: 'بشت',
    socks: 'جوارب',
    sock: 'جورب',
    cap: 'كاب',
    hat: 'قبعة',
    handkerchief: 'منديل جيب',
    hankie: 'منديل جيب',
    towel: 'منشفة',
    pillowcase: 'غطاء مخدة',
    pillow: 'مخدة',
    rug: 'سجاد',
    mat: 'سجادة',
    kaftan: 'قفطان',
    jalabiya: 'جلابية',
    overalls: 'أوفرول',
    uniform: 'زي موحد',
  };

  const SIZE_MAP = {
    small: 'صغير',
    large: 'كبير',
    big: 'كبير',
    single: 'مفرد',
    double: 'مزدوج',
  };

  const TYPE_MAP = {
    summer: 'صيفي',
    winter: 'شتوي',
    premium: 'ممتاز',
    special: 'خاص',
    military: 'عسكري',
  };

  const words = key.split(/[\s_\-/+()]+/);
  let noun = '';
  let size = '';
  let type = '';

  for (const w of words) {
    if (!w) continue;
    if (NOUN_MAP[w]) noun = NOUN_MAP[w];
    if (SIZE_MAP[w]) size = SIZE_MAP[w];
    if (TYPE_MAP[w]) type = TYPE_MAP[w];
  }

  if (noun) {
    let result = noun;
    const isFeminine = /^[أإا]?[\u0600-\u06FF]*ة$/.test(noun) || noun === 'عباية';
    
    if (size) {
      let sizeAr = size;
      if (isFeminine) {
        if (size === 'صغير') sizeAr = 'صغيرة';
        if (size === 'كبير') sizeAr = 'كبيرة';
      }
      result += ' ' + sizeAr;
    }
    if (type) {
      let typeAr = type;
      if (isFeminine) {
        if (type === 'صيفي') typeAr = 'صيفية';
        if (type === 'شتوي') typeAr = 'شتوية';
        if (type === 'ممتاز') typeAr = 'ممتازة';
        if (type === 'خاص') typeAr = 'خاصة';
        if (type === 'عسكري') typeAr = 'عسكرية';
      }
      result += ' ' + typeAr;
    }
    return result;
  }

  // Fallback to simple word translation
  for (const w of words) {
    if (w && GARMENT_NAME_MAP[w]) {
      return GARMENT_NAME_MAP[w];
    }
  }
  return null;
};

export const resolveGarmentArabicName = (name, catalogItem) => {
  if (catalogItem?.nameAr) return catalogItem.nameAr;
  return translateGarmentName(name);
};

export const getBilingualGarmentNames = (name, catalogList = []) => {
  if (!name) return { en: 'N/A', ar: 'N/A' };
  const cleanName = String(name).trim();

  // A. Check custom catalog list first
  if (Array.isArray(catalogList) && catalogList.length > 0) {
    const found = catalogList.find(c => c.name && c.name.toLowerCase() === cleanName.toLowerCase());
    if (found) {
      let arName = found.nameAr || '';
      
      // Smart check if the stored translation is incomplete/outdated:
      const nameLower = found.name.toLowerCase();
      const arNameLower = arName.toLowerCase();
      const MODIFIERS = [
        { en: 'small', ar: ['صغير', 'صغيرة'] },
        { en: 'large', ar: ['كبير', 'كبيرة'] },
        { en: 'big', ar: ['كبير', 'كبيرة'] },
        { en: 'single', ar: ['مفرد', 'مفردة'] },
        { en: 'double', ar: ['مزدوج', 'مزدوجة'] },
        { en: 'summer', ar: ['صيفي', 'صيفية'] },
        { en: 'winter', ar: ['شتوي', 'شتوية'] },
        { en: 'military', ar: ['عسكري', 'عسكرية'] },
        { en: 'premium', ar: ['ممتاز', 'ممتازة'] },
        { en: 'special', ar: ['خاص', 'خاصة'] }
      ];

      let needsUpdate = false;
      for (const mod of MODIFIERS) {
        if (nameLower.includes(mod.en)) {
          const hasArMod = mod.ar.some(arWord => arNameLower.includes(arWord));
          if (!hasArMod) {
            needsUpdate = true;
            break;
          }
        }
      }

      if (needsUpdate || !arName || !/[\u0600-\u06FF]/.test(arName)) {
        arName = translateGarmentName(found.name) || found.name;
      }
      return { en: found.name, ar: arName };
    }
  }

  // B. Check standard translation JSON dictionary
  const catalogSection = translations?.en?.counter?.makeInvoice || {};
  const keys = Object.keys(catalogSection);
  for (const key of keys) {
    const enVal = catalogSection[key];
    if (typeof enVal === 'string' && enVal.toLowerCase() === cleanName.toLowerCase()) {
      const arVal = translations?.ar?.counter?.makeInvoice?.[key] || enVal;
      return { en: enVal, ar: arVal };
    }
  }

  // C. Common spelling/transliteration fallbacks
  const lowerName = cleanName.toLowerCase();
  if (lowerName === 'ghotraa') return { en: 'Ghotraa', ar: 'غترة' };
  if (lowerName === 'shmage') return { en: 'Shmage', ar: 'شماغ' };
  if (lowerName === 'shmage (special)') return { en: 'Shmage (Special)', ar: 'شماغ (خاص)' };

  // D. Dynamic split-word/phrase translation
  const smartAr = translateGarmentName(cleanName);
  if (smartAr) {
    return { en: cleanName, ar: smartAr };
  }

  return { en: cleanName, ar: cleanName };
};
