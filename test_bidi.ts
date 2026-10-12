function mirrorBrackets(char: string): string {
    switch (char) {
        case '(': return ')';
        case ')': return '(';
        case '[': return ']';
        case ']': return '[';
        case '{': return '}';
        case '}': return '{';
        case '<': return '>';
        case '>': return '<';
        default: return char;
    }
}

export function solveBidi(text: string): string {
    if (!text) return '';
    const isRtl = /[\u0590-\u05FF\u0600-\u06FF]/.test(text);
    if (!isRtl) return text;

    // Pattern for an LTR chunk:
    // Starts with Latin/digit, continues with Latin/digits or inner punctuation/spaces that are followed by Latin/digits
    const ltrPattern = '[a-zA-Z0-9](?:[a-zA-Z0-9]|(?:[ \\t\\-_.,\\/:+@#&\'’](?=[a-zA-Z0-9])))*[%₪$€]?';
    const rtlPattern = '[\\u0590-\\u05FF\\u0600-\\u06FF"״\'׳]+';
    const bracketPattern = '[()[\\]{}<>]+';
    const neutralPattern = '[^\\u0590-\\u05FF\\u0600-\\u06FFa-zA-Z0-9()[\\]{}<>]+';

    const masterRegex = new RegExp(
        `(${ltrPattern})|(${rtlPattern})|(${bracketPattern})|(${neutralPattern})`,
        'g'
    );

    const tokens: { text: string; type: 'ltr' | 'rtl' | 'bracket' | 'neutral' }[] = [];
    let match: RegExpExecArray | null;
    while ((match = masterRegex.exec(text)) !== null) {
        if (match[1]) tokens.push({ text: match[1], type: 'ltr' });
        else if (match[2]) tokens.push({ text: match[2], type: 'rtl' });
        else if (match[3]) tokens.push({ text: match[3], type: 'bracket' });
        else if (match[4]) tokens.push({ text: match[4], type: 'neutral' });
    }

    const reversed = tokens.reverse().map(tok => {
        if (tok.type === 'rtl') {
            return tok.text.split('').reverse().map(mirrorBrackets).join('');
        }
        if (tok.type === 'bracket') {
            return tok.text.split('').reverse().map(mirrorBrackets).join('');
        }
        return tok.text;
    });

    return reversed.join('');
}

const tests = [
    'טלפון: 050-1234567',
    'שם הדייר: John Smith',
    'מעלית Otis Gen 2',
    'בניין A דירה 12',
    'טלפון: 050 123 4567',
    'חברת ABC Solutions',
    'דירה 12B',
    'דגם Model X-500',
    'סכום: 1,500 ₪',
    'בדיקה (050-1234567) הושלמה',
    'תאריך: 11/10/2026',
    'חדר 101 בקומה 2',
    'מזגן Tadiran Inverter 3.5HP'
];

for (const t of tests) {
    console.log(t, '===>', solveBidi(t));
}
