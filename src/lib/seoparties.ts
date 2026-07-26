// lib/seoparties.ts

export type SeoPageConfig = {
  slug: string;
  title: string;
  description: string;
  apiFilters: {
    region?: string;
    cityTag?: string;     // Matches values inside 'tags' or 'city' field
    age?: string;         // Matches values inside 'tags' (e.g., "18+", "24+") or 'age' field
    musicType?: string;   // Matches primary music type
    eventType?: string;
    generalTag?: string;  // Matches specific strings in tags (e.g., "free alcohol", "rooftop")
    dateRange?: 'today' | 'weekend';
  };
};

export const SPECIFIC_PARTIES_PAGES: SeoPageConfig[] = [
  // ========================================================
  // ⚡ TIME BASED (TODAY / WEEKEND)
  // ========================================================
  {
    slug: 'parties-in-tel-aviv-today',
    title: 'מסיבות היום בתל אביב',
    description: 'כל המסיבות שקורות הערב בתל אביב. להזמין כרטיס מעכשיו לעכשיו ולצאת לבלות.',
    apiFilters: { cityTag: 'תל אביב', dateRange: 'today' }
  },
  {
    slug: 'parties-in-tel-aviv-weekend',
    title: 'מסיבות סופ״ש בתל אביב',
    description: 'המדריך המלא למסיבות חמישי, שישי ושבת בתל אביב.',
    apiFilters: { cityTag: 'תל אביב', dateRange: 'weekend' }
  },
  {
    slug: 'techno-parties-today',
    title: 'מסיבות טכנו הערב',
    description: 'איפה רוקדים טכנו היום? רשימת האירועים האלקטרוניים שפתוחים הערב.',
    apiFilters: { musicType: 'טכנו', dateRange: 'today' }
  },
  {
    slug: 'techno-parties-weekend',
    title: 'מסיבות טכנו בסופ״ש',
    description: 'כל הרייבים, המועדונים והאפטרים של סוף השבוע הקרוב.',
    apiFilters: { musicType: 'טכנו', dateRange: 'weekend' }
  },
  {
    slug: 'mainstream-parties-today',
    title: 'מסיבות מיינסטרים להיום',
    description: 'לרקוד את הלהיטים הכי חמים הערב בברים ובמועדונים.',
    apiFilters: { musicType: 'מיינסטרים', dateRange: 'today' }
  },
  {
    slug: 'mainstream-parties-weekend',
    title: 'מסיבות מיינסטרים בסופ״ש',
    description: 'הפקות סוף השבוע עם מוזיקת פופ, רגאטון ולהיטים.',
    apiFilters: { musicType: 'מיינסטרים', dateRange: 'weekend' }
  },

  // ========================================================
  // 📍 LOCATION + GENRE COMBINATIONS
  // ========================================================
  {
    slug: 'techno-parties-tel-aviv',
    title: 'מסיבות טכנו בתל אביב',
    description: 'סצנת האנדרגראונד, מועדוני הפאר והליינים האלקטרוניים של תל אביב.',
    apiFilters: { cityTag: 'תל אביב', musicType: 'טכנו' }
  },
  {
    slug: 'mainstream-parties-tel-aviv',
    title: 'מסיבות מיינסטרים בתל אביב',
    description: 'המועדונים הכי שמחים בתל אביב לקהל שאוהב לרקוד ולשיר.',
    apiFilters: { cityTag: 'תל אביב', musicType: 'מיינסטרים' }
  },
  {
    slug: 'house-parties-tel-aviv',
    title: 'מסיבות האוס בתל אביב',
    description: 'גגות, שקיעות ומועדונים עם מוזיקת האוס ודיסקו בתל אביב.',
    apiFilters: { cityTag: 'תל אביב', generalTag: 'האוס' } // Searching 'house' in tags/genre
  },
  {
    slug: 'parties-in-haifa-and-north',
    title: 'מסיבות בחיפה ובצפון',
    description: 'חיי הלילה של הצפון – ממועדונים בחיפה ועד מסיבות טבע בגליל.',
    apiFilters: { region: 'צפון' }
  },
  {
    slug: 'techno-parties-north',
    title: 'מסיבות טכנו בצפון',
    description: 'קהילת הטכנו הצפונית – מסיבות בחיפה, קריות והעמקים.',
    apiFilters: { region: 'צפון', musicType: 'טכנו' }
  },
  {
    slug: 'parties-in-south-and-beer-sheva',
    title: 'מסיבות בדרום ובאר שבע',
    description: 'סצנת הסטודנטים, מועדוני הענק והפקות המדבר של הדרום.',
    apiFilters: { region: 'דרום' }
  },

  // ========================================================
  // 👥 AUDIENCE BASED
  // ========================================================
  {
    slug: '18-plus-parties-tel-aviv',
    title: 'מסיבות 18 פלוס בתל אביב ובכל הארץ',
    description: 'מסיבות 18 פלוס בתל אביב, במרכז ובכל הארץ – ליינים לצעירים לפני ואחרי צבא, מחירי כניסה וכרטיסים. מתעדכן כל יום.',
    apiFilters: { cityTag: 'תל אביב', age: '18+' }
  },
  {
    slug: '18-plus-parties-weekend',
    title: 'מסיבות 18+ לסופ״ש הקרוב',
    description: 'כל מה שפתוח לקהל הצעיר בחמישי ושישי הקרובים.',
    apiFilters: { age: '18+', dateRange: 'weekend' }
  },
  {
    slug: 'soldiers-parties-weekend',
    title: 'מסיבות לחיילים בסופ״ש',
    description: 'הטבות חוגר, כניסה חינם ומסיבות שמתאימות במיוחד לחיילים.',
    apiFilters: { age: 'חיילים' } // Ensures mapping looks for "Soldier" related tags
  },
  {
    slug: 'students-parties-tel-aviv',
    title: 'מסיבות סטודנטים בתל אביב',
    description: 'ליינים אקדמיים, מסיבות פתיחת סמסטר והנחות לסטודנטים.',
    apiFilters: { cityTag: 'תל אביב', age: 'סטודנט' }
  },
  {
    slug: '24-plus-parties-tel-aviv',
    title: 'מסיבות 24+ בתל אביב',
    description: 'קהל בוגר, אווירה איכותית ומוזיקה מדוייקת בעיר.',
    apiFilters: { cityTag: 'תל אביב', age: '24+' }
  },

  // ========================================================
  // ✨ SPECIAL FEATURES & VIBES
  // ========================================================
  {
    slug: 'free-alcohol-parties-tel-aviv',
    title: 'מסיבות עם אלכוהול חופשי בתל אביב',
    description: 'מסלולי שתייה ללא הגבלה, צמידים וברים חופשיים בתל אביב.',
    apiFilters: { cityTag: 'תל אביב', generalTag: 'אלכוהול' }
  },
  {
    slug: 'nature-trance-parties',
    title: 'מסיבות טבע וטראנס',
    description: 'לרקוד תחת כיפת השמיים – פסטיבלים, מחתרות וטראנס.',
    apiFilters: { musicType: 'טראנס' }
  },
  {
    slug: 'after-parties-tel-aviv',
    title: 'אפטרים בתל אביב',
    description: 'למי שרוצה להמשיך לרקוד בבוקר – אירועי האפטר החזקים בעיר.',
    apiFilters: { cityTag: 'תל אביב', generalTag: 'אפטר' }
  },
  {
    slug: 'sunset-parties',
    title: 'מסיבות שקיעה וצהריים',
    description: 'אירועים שמתחילים באור יום וממשיכים לתוך הלילה.',
    apiFilters: { generalTag: 'שקיעה' } // Requires tags like "Sunset", "Tzahorayim"
  },
];