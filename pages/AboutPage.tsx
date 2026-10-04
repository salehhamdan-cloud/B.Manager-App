import React from 'react';
import { useSettings } from '../contexts/SettingsContext';

const AboutPage: React.FC = () => {
    const { settings } = useSettings();

    const featureGroups = [
        {
            title: "ניהול ובקרה מרכזיים",
            features: [
                "לוחות בקרה חכמים (Dashboard): קבל תמונת מצב ויזואלית על כל הפרויקטים שלך, כולל תקלות קריטיות, סטטוסים ומשימות שפג תוקפפן, ברמה גלובלית או פרטנית.",
                "ניהול מקיף: עקוב אחר כל הבניינים, הדוחות, הספקים, הדיירים והמשימות שלך במקום אחד מאורגן.",
                "ניהול מלאי מפורט: קטלג ציוד ופריטים לפי מבנה, מיקום וקבוצה, כולל תמונות, אחריות ומדריכים טכניים.",
                "מעקב הצעות מחיר: נהל הצעות מחיר, עקוב אחר סטטוס תשלום וביצוע, והפק דוחות הוצאות מפורטים."
            ]
        },
        {
            title: "כלי שטח מתקדמים",
            features: [
                "תיעוד חזותי מתקדם: תעד תקלות עם תמונות והוסף הערות, שרטוטים וסימונים ישירות על גבי התמונה לבהירות מרבית.",
                "סריקת מסמכים ניידת: סרוק מסמכים מהשטח ישירות מהמצלמה לקובץ PDF איכותי, עם אפשרויות עריכה וחתימה.",
                "טפסים דיגיטליים: צור תבניות טפסים מותאמות אישית לכל צורך, מלא אותם בשטח, וצרף חתימות דיגיטליות.",
                "ניהול קבצים חכם: שמור מסמכים חשובים, הגדר תאריכי תפוגה ונהל משימות חוזרות עם תזכורות אוטומטיות."
            ]
        },
        {
            title: "אוטומציה ובינה מלאכותית (AI)",
            features: [
                "יבוא חכם (AI): המר קבצי PDF ו-CSV של דוחות, רשימות דיירים, ספקים והצעות מחיר ישירות לתוך המערכת בצורה אוטומטית.",
                "סיכומי דוחות אוטומטיים (AI): קבל סיכום מנהלים תמציתי ומקצועי לרשימות תקלות ארוכות בלחיצת כפתור.",
                "התראות אוטומטיות במייל: קבל עדכונים בזמן אמת על תקלות קריטיות ומשימות דחופות ישירות לתיבת הדואר שלך."
            ]
        },
        {
            title: "ניתוח ודיווח",
            features: [
                "חיפוש גלובלי מהיר: מצא כל פריט מידע באפליקציה - בניין, דוח, תקלה, קובץ או ספק - תוך שניות בודדות.",
                "רשימות תקלות חכמות: נהל את כל התקלות הפתוחות מכל הבניינים במקום אחד, סנן, מיין וייצא רשימות עבודה ל-PDF.",
                "ייצוא מקצועי: הפק דוחות PDF וקבצי Excel מעוצבים ומותאמים אישית עם הלוגו והצבעים של החברה שלך.",
                "גיבוי ושחזור מאובטח: גבה את כל המידע שלך באופן מקומי או לענן (Google Drive) ושחזר אותו בקלות בכל עת."
            ]
        }
    ];


    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
            {/* Hero Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sky-300 text-xs font-semibold mb-4 border border-white/10 backdrop-blur-sm">
                        <span>🏢</span>
                        <span>Enterprise Building Management v4.2</span>
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-3">
                        B.Manager
                    </h1>
                    <p className="text-base sm:text-xl text-slate-300 max-w-2xl leading-relaxed">
                        פלטפורמת הניהול והתחזוקה המתקדמת לנכסים, בנייני יוקרה, מרכזים מסחריים ומבני מגורים משותפים.
                    </p>
                    <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-slate-800 text-xs sm:text-sm text-slate-400 font-mono-numbers">
                        <div><strong className="text-white font-bold">100%</strong> סנכרון Offline-First</div>
                        <div>&bull;</div>
                        <div><strong className="text-white font-bold">AI</strong> אוטומציה וחילוץ דוחות</div>
                        <div>&bull;</div>
                        <div><strong className="text-white font-bold">PDF</strong> הפקת תיעוד מקצועי</div>
                    </div>
                </div>
            </div>

            {/* Mission Statement */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mb-2">אודות המערכת</h2>
                <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                    B.Manager היא מערכת ענן ומובייל היברידית שפותחה במיוחד עבור מנהלי בניינים, מפקחי הנדסה, חברות ניהול ואחזקה וועדי בתים. המערכת מחברת בין השטח למשרד בזמן אמת, ומאפשרת בקרת תקלות מדויקת, ניהול מסמכים וטפסים מבוקרי גרסאות, מעקב הצעות מחיר וחשבוניות, ולוח שנה מונע לתחזוקת מערכות קריטיות (מעליות, משאבות, גנרטורים וגילוי אש).
                </p>
            </div>
            
            {/* Feature Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {featureGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-lg border border-sky-100 shadow-2xs">
                                    {groupIndex === 0 ? '📊' : groupIndex === 1 ? '🛠️' : groupIndex === 2 ? '✨' : '📑'}
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                                    {group.title}
                                </h3>
                            </div>
                            <ul className="space-y-3">
                                {group.features.map((feature, featureIndex) => (
                                    <li key={featureIndex} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                                        <div className="w-1.5 h-1.5 rounded-full bg-sky-600 mt-2 flex-shrink-0" />
                                        <p>{feature}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Footer */}
            <footer className="py-6 border-t border-slate-200/90 text-center text-slate-400 text-xs sm:text-sm flex flex-col sm:flex-row justify-between items-center gap-2">
                <p>&copy; {new Date().getFullYear()} B.Manager System. כל הזכויות שמורות.</p>
                <p className="font-medium text-slate-500">פותח על ידי סאלח חמדאן (Saleh Hamdan)</p>
            </footer>
        </div>
    );
};

export default AboutPage;