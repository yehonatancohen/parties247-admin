export interface PageLinkOption {
  label: string;
  path: string;
  tag?: string;
  description?: string;
}

export const pageLinkOptions: PageLinkOption[] = [
  {
    label: 'מסיבות סטודנטים',
    path: '/audience/student-parties',
    tag: 'סטודנטים',
    description: 'אירועים עם הנחות סטודנט ואווירה קמפוסית.',
  },
  {
    label: 'מסיבות נוער',
    path: '/audience/teenage-parties',
    tag: 'נוער',
    description: 'מסיבות מותאמות לגילאי נוער עם פיקוח בטיחותי.',
  },
  {
    label: 'מסיבות חיילים',
    path: '/audience/soldier-parties',
    tag: 'חיילים',
    description: 'ליינים שמקבלים חוגר ומציעים כניסה מוזלת.',
  },
  {
    label: 'מסיבות 24+',
    path: '/audience/24plus-parties',
    tag: '24 פלוס',
    description: 'ערבים בוגרים יותר עם קהל 24 פלוס.',
  },
  {
    label: 'מסיבות חמישי',
    path: '/day/thursday',
    description: 'הפתיחה הרשמית של סוף השבוע עם מסיבות חמישי.',
  },
  {
    label: 'מסיבות שישי',
    path: '/day/friday',
    description: 'רשימת האירועים החמים לשישי הקרוב.',
  },
  {
    label: 'מסיבות שבת',
    path: '/saturday-parties',
    description: 'מוצאי שבת על הרחבה עם דיג׳יים מובילים.',
  },
  {
    label: 'מסיבות סוף שבוע',
    path: '/day/weekend',
    description: 'כל מה שקורה בין חמישי לשבת בערב אחד.',
  },
  {
    label: 'מסיבות היום',
    path: '/day/today',
    description: 'רשימת ספונטנית של מה שקורה עוד הלילה.',
  },
  {
    label: 'מסיבות בתל אביב',
    path: '/cities/tel-aviv',
    description: 'אירועים בעיר שלא נרדמת – טכנו, גגות וחופים.',
  },
  {
    label: 'מסיבות בחיפה',
    path: '/cities/haifa',
    description: 'אירועים בעיר הצפונית עם אווירה מרהיבה.',
  }
];
