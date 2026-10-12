
import { GoogleGenAI, Type } from "@google/genai";
import { Problem, FormTemplate, ProblemSeverity, Tenant, Supplier, Quotation, QuotationStatus } from '../types';

let ai: GoogleGenAI;

/**
 * Gets the active Gemini model based on user selection in settings or local storage fallback.
 * Valid models per @google/genai guidelines:
 * - gemini-3.8-flash (default, multimodal, fast)
 * - gemini-3.1-pro-preview (advanced reasoning)
 * - gemini-3.1-flash-lite (lightweight & ultra fast)
 * - gemini-flash-latest
 */
export function getActiveGeminiModel(overrideModel?: string): string {
    if (overrideModel && overrideModel.trim()) {
        return overrideModel.trim();
    }
    if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('gemini_model_version');
        if (stored && ['gemini-3.8-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite', 'gemini-flash-latest'].includes(stored)) {
            return stored;
        }
    }
    return 'gemini-3.8-flash';
}

export function setActiveGeminiModel(model: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('gemini_model_version', model);
    }
}

function formatAiError(error: any): Error {
    const errorStr = String(error?.message || error || '');
    if (errorStr.includes("resource_exhausted") || errorStr.includes("quota") || errorStr.includes("429")) {
        return new Error("מכסת השימוש ב-AI נוצלה זמנית. אנא המתן מספר רגעים או נסה שוב מאוחר יותר.");
    }
    if (errorStr.includes("API Key") || errorStr.includes("API_KEY")) {
        return new Error("מפתח ה-API של Gemini אינו מוגדר.");
    }
    return new Error(errorStr || "שגיאה בעיבוד ה-AI.");
}

function getAiClient() {
    if (!navigator.onLine) {
        throw new Error("AI features require an internet connection.");
    }
    if (!ai) {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            console.error("API_KEY environment variable not set.");
            throw new Error("API Key for Gemini is not configured.");
        }
        ai = new GoogleGenAI({ apiKey });
    }
    return ai;
}

/**
 * Generates a professional description for a construction problem based on an image.
 */
export const generateDescriptionFromImage = async (base64Image: string, mimeType: string, preferredModel?: string): Promise<string> => {
    try {
        const client = getAiClient();
        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType,
            },
        };
        const textPart = {
            text: "אתה מפקח בנייה מומחה. בהתבסס על התמונה, ספק תיאור תמציתי ומקצועי של הליקוי עבור דוח רשמי. התמקד בזיהוי הבעיה העיקרית בצורה ברורה. ענה בעברית בלבד."
        };

        const response = await client.models.generateContent({
            model: getActiveGeminiModel(preferredModel),
            contents: { parts: [imagePart, textPart] },
        });

        const text = response.text;
        if (!text) {
            throw new Error("The AI returned an empty description.");
        }
        return text.trim();
    } catch (error) {
        console.error("Error generating description from image:", error);
        if (error instanceof Error && error.message.includes("API Key")) {
            throw error;
        }
        throw new Error("Failed to generate description from image using AI.");
    }
};

export const generateReportFromPdf = async (text: string, images: string[], preferredModel?: string): Promise<{ title: string; date: string; description: string; problems: Partial<Problem>[] }> => {
    try {
        const client = getAiClient();
        const modelToUse = preferredModel || getActiveGeminiModel();
        const response = await client.models.generateContent({
            model: modelToUse === 'gemini-3.1-pro-preview' ? 'gemini-3.1-pro-preview' : 'gemini-3.8-flash',
            contents: `Analyze the following report text and associated images to generate a structured JSON output. The text is: "${text}". There are ${images.length} images. Extract the report title, date, a general description, and a list of problems. For each problem, provide a description, severity (LOW, MEDIUM, HIGH, CRITICAL), locationTag, and a list of associated image indices. The JSON response must follow this schema:`,
             config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        date: { type: Type.STRING },
                        description: { type: Type.STRING },
                        problems: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    description: { type: Type.STRING },
                                    severity: { type: Type.STRING, enum: [ProblemSeverity.LOW, ProblemSeverity.MEDIUM, ProblemSeverity.HIGH, ProblemSeverity.CRITICAL] },
                                    locationTag: { type: Type.STRING },
                                    images: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { imageIndex: { type: Type.INTEGER }, caption: { type: Type.STRING } } } }
                                }
                            }
                        }
                    }
                }
            },
        });
        
        let jsonStr = (response.text || '').trim();
        const jsonMatch = jsonStr.match(/```(?:json)?([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonStr = jsonMatch[1];
        }

        try {
            return JSON.parse(jsonStr) as { title: string; date: string; description: string; problems: Partial<Problem>[] };
        } catch(e) {
            console.error("Failed to parse AI JSON response for report:", e);
            console.error("Raw AI response text:", jsonStr);
            throw new Error("AI returned an invalid data format. Check the console for the raw response.");
        }
    } catch (error) {
        console.error("Error generating report from PDF:", error);
        throw new Error("Failed to parse report from PDF using AI.");
    }
};

export const generateFormTemplateFromPdfText = async (text: string, preferredModel?: string): Promise<Partial<FormTemplate>> => {
    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: getActiveGeminiModel(preferredModel),
            contents: `Convert the following text from a form PDF into a structured JSON FormTemplate. The text is: "${text}"`,
             config: {
                responseMimeType: "application/json",
            },
        });
        
        let jsonStr = (response.text || '').trim();
        const jsonMatch = jsonStr.match(/```(?:json)?([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonStr = jsonMatch[1];
        }

        try {
            return JSON.parse(jsonStr) as Partial<FormTemplate>;
        } catch(e) {
            console.error("Failed to parse AI JSON response for form template:", e);
            console.error("Raw AI response text:", jsonStr);
            throw new Error("AI returned an invalid data format. Check the console for the raw response.");
        }
    } catch (error) {
        console.error("Error generating form template from PDF:", error);
        throw new Error("Failed to parse form template from PDF using AI.");
    }
};

export const generateReportSummary = async (problems: Problem[], preferredModel?: string): Promise<string> => {
    const problemDescriptions = problems.map(p => `- ${p.description} (Severity: ${p.severity})`).join('\n');
    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: getActiveGeminiModel(preferredModel),
            contents: `Based on the following list of problems, write a concise executive summary for a report. Problems:\n${problemDescriptions}`,
        });
        return (response.text || '').trim();
    } catch (error) {
        console.error("Error generating report summary:", error);
        throw new Error("Failed to generate report summary using AI.");
    }
};

export const generateTenantsFromText = async (text: string, preferredModel?: string): Promise<Partial<Tenant>[]> => {
    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: getActiveGeminiModel(preferredModel),
            contents: `Parse the following text from a PDF/CSV/Excel into a JSON array of tenants. The text can be in Hebrew, Arabic, or English. Text: "${text}"`,
            config: {
                responseMimeType: "application/json",
            },
        });
        
        let jsonStr = (response.text || '').trim();
        const jsonMatch = jsonStr.match(/```(?:json)?([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonStr = jsonMatch[1];
        }

        let parsedData;
        try {
            parsedData = JSON.parse(jsonStr);
        } catch (e) {
            console.error("Failed to parse AI JSON response for tenants:", e);
            console.error("Raw AI response text:", jsonStr);
            throw new Error("AI returned an invalid data format. Check the console for the raw response.");
        }

        if (!Array.isArray(parsedData)) {
            console.error("AI response was valid JSON but not an array:", parsedData);
            throw new Error("AI did not return a valid list (array) of tenants.");
        }
        return parsedData as Partial<Tenant>[];
    } catch (error) {
        console.error("Error generating tenants from text:", error);
        throw new Error("Failed to parse tenants from text using AI.");
    }
};

export const generateSuppliersFromText = async (text: string, preferredModel?: string): Promise<Partial<Supplier>[]> => {
    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: getActiveGeminiModel(preferredModel),
            contents: `Parse the following text from a PDF/CSV/Excel into a JSON array of suppliers. The text can be in Hebrew, Arabic, or English. Text: "${text}"`,
             config: {
                responseMimeType: "application/json",
            },
        });
        
        let jsonStr = (response.text || '').trim();
        const jsonMatch = jsonStr.match(/```(?:json)?([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonStr = jsonMatch[1];
        }
        
        let parsedData;
        try {
            parsedData = JSON.parse(jsonStr);
        } catch (e) {
            console.error("Failed to parse AI JSON response for suppliers:", e);
            console.error("Raw AI response text:", jsonStr);
            throw new Error("AI returned an invalid data format. Check the console for the raw response.");
        }

        if (!Array.isArray(parsedData)) {
            console.error("AI response was valid JSON but not an array:", parsedData);
            throw new Error("AI did not return a valid list (array) of suppliers.");
        }
        return parsedData as Partial<Supplier>[];
    } catch (error) {
        console.error("Error generating suppliers from text:", error);
        throw new Error("Failed to parse suppliers from text using AI.");
    }
};

export const generateQuotationsFromText = async (text: string, preferredModel?: string): Promise<Partial<Quotation>[]> => {
    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: getActiveGeminiModel(preferredModel),
            contents: `Your task is to parse text from a CSV or Excel file and convert it into a JSON array of quotations. The data may be in Hebrew, Arabic, or English.

            **Instructions:**
            1.  **Column Mapping:** Identify and extract data from the following columns. The column names might have slight variations.
                - \`quotationName\`: from 'תיאור הצעת המחיר' / description
                - \`quotationNumber\`: from "מס' הצעה" / quote number
                - \`invoiceNumber\`: from "מס' חשבונית" / invoice number
                - \`price\`: from 'מחיר' / price / amount
                - \`group\`: from 'תחום' / category
                - \`supplierName\`: from 'חברה' / supplier / vendor
                - \`projectName\`: from 'בניין' / project / building
                - \`date\`: from 'תאריך אישור' / date
                - \`status\`: from 'סטטוס' / status
            2.  **Data Cleaning:**
                - **Price:** The 'מחיר' value must be a number. Remove currency symbols (like ₪), commas, and any non-numeric characters before parsing. If it's not a valid number, set it to 0.
                - **Date:** The 'תאריך אישור' can be in formats like DD/MM/YYYY or DD.MM.YYYY. Convert it to \`YYYY-MM-DD\` format for the output. If the date is invalid, omit the date field.
            3.  **Special Logic:**
                - If a column named 'שולם' exists and its value indicates payment (e.g., 'כן', 'שולם', 'V'), set the final \`status\` field to "חשבונית שולמה" (which corresponds to the INVOICE_PAID enum), overriding any other status.
            4.  **Robustness:** The input text might be messy. Ignore empty lines, extra commas, and handle rows with missing data gracefully.
            5.  **Required Field:** The \`quotationName\` is mandatory. If a row does not contain a value for 'תיאור הצעת המחיר', skip that row entirely.
            6.  **Output Format:** Return only the JSON array, with no extra text or markdown.

            The text to parse is:
            "${text}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            quotationName: { type: Type.STRING, description: 'From "תיאור הצעת המחיר" column. This is a required field.' },
                            quotationNumber: { type: Type.STRING, description: "From \"מס' הצעה\" column." },
                            invoiceNumber: { type: Type.STRING, description: "From \"מס' חשבונית\" column." },
                            price: { type: Type.NUMBER, description: 'From "מחיר" column. Should be a number.' },
                            group: { type: Type.STRING, description: 'From "תחום" column.' },
                            supplierName: { type: Type.STRING, description: 'From "חברה" column.' },
                            projectName: { type: Type.STRING, description: 'From "בניין" column.' },
                            date: { type: Type.STRING, description: 'From "תאריך אישור" column, must be in YYYY-MM-DD format.' },
                            status: {
                                type: Type.STRING,
                                description: 'From "סטטוס" column. If a "שולם" (Paid) column indicates payment, this should be "חשבונית שולמה".',
                                enum: Object.values(QuotationStatus),
                            },
                        },
                        required: ['quotationName']
                    },
                },
            },
        });

        // Robust JSON parsing to handle markdown code blocks
        let jsonStr = (response.text || '').trim();
        const jsonMatch = jsonStr.match(/```(?:json)?([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonStr = jsonMatch[1];
        }

        let parsedData;
        try {
            parsedData = JSON.parse(jsonStr);
        } catch (e) {
            console.error("Failed to parse AI JSON response for quotations:", e);
            console.error("Raw AI response text:", jsonStr);
            throw new Error("AI returned an invalid data format. Check the console for the raw response.");
        }

        if (!Array.isArray(parsedData)) {
            console.error("AI response was valid JSON but not an array:", parsedData);
            throw new Error("AI did not return a valid list (array) of quotations.");
        }
        return parsedData as Partial<Quotation>[];
    } catch (error) {
        console.error("Error generating quotations from text:", error);
        if (error instanceof Error && error.message.includes("API Key")) {
            throw error;
        }
        throw new Error("Failed to parse quotations from the provided text using AI. Please check the text format.");
    }
};

/**
 * Result structure for comprehensive AI smart entity extraction across files and text.
 */
export interface SmartImportEntityResult {
    tenants: Array<{
        name: string;
        phone?: string;
        email?: string;
        apartmentNumber?: string;
        floorNumber?: string;
        rentAmount?: number;
        leaseStartDate?: string;
        leaseEndDate?: string;
        contactPerson?: string;
        buildingName?: string;
    }>;
    buildings: Array<{
        name: string;
        address?: string;
        apartmentsCount?: number;
        managerName?: string;
        managerPhone?: string;
    }>;
    issues: Array<{
        title: string;
        description: string;
        priority: ProblemSeverity;
        apartmentNumber?: string;
        buildingName?: string;
    }>;
    workers: Array<{
        name: string;
        specialty?: string;
        phone?: string;
        email?: string;
    }>;
    suppliers: Array<{
        name: string;
        category?: string;
        phone?: string;
        email?: string;
    }>;
    inventory: Array<{
        name: string;
        quantity: number;
        sku?: string;
        location?: string;
        buildingName?: string;
    }>;
    invoices: Array<{
        invoiceNumber?: string;
        supplierName?: string;
        amount?: number;
        date?: string;
        buildingName?: string;
    }>;
}

/**
 * Smartly extracts structured entities from multi-format input (Word, Excel, PDF, Photos/Images, Text)
 * with robust multilingual support for Hebrew (עברית), Arabic (العربية), and English.
 */
export const smartExtractEntitiesWithAi = async ({
    text,
    images = [],
    preferredModel
}: {
    text: string;
    images?: { base64Data: string; mimeType: string }[];
    preferredModel?: string;
}): Promise<SmartImportEntityResult> => {
    try {
        const client = getAiClient();
        const modelToUse = getActiveGeminiModel(preferredModel);

        const promptText = `
אתה מומחה AI לניהול נכסים, מבנים ותחזוקה עבור מערכת B.Manager.
לפניך קבצים ומידע טקסטי (כולל מסמכי Word, גיליונות Excel, קובצי PDF, תמונות/צילומים ופתקים).
המידע עשוי להופיע בעברית, בערבית (العربية), באנגלית, או בשילוב שפות.

עליך לנתח את כל המידע (הטקסט והתמונות המצורפות), לזהות במדויק את כל הישויות ולסווג כל אחת לקטגוריה המתאימה לה:

1. tenants (דיירים / مستأجرים):
   - name: שם הדייר (בעברית / ערבית / אנגלית)
   - phone: מספר טלפון (שמור על הספרות במדויק)
   - email: דוא"ל
   - apartmentNumber: מספר דירה / יחידה
   - floorNumber: קומה
   - rentAmount: סכום שכירות במספר
   - leaseStartDate: תאריך תחילת חוזה (YYYY-MM-DD אם ניתן)
   - leaseEndDate: תאריך סיום חוזה (YYYY-MM-DD אם ניתן)
   - contactPerson: איש קשר
   - buildingName: שם הבניין / הנכס המשויך

2. buildings (מבנים / נכסים / مباني / عقارات):
   - name: שם הבניין / כתובת ראשית
   - address: כתובת מלאה
   - apartmentsCount: מספר דירות / יחידות
   - managerName: שם מנהל / ועד
   - managerPhone: טלפון מנהל

3. issues (תקלות / ליקויים / קריאות שירות / مشاكل وصيانة):
   - title: כותרת תמציתית של התקלה
   - description: תיאור מפורט של התקלה או הליקוי
   - priority: דחיפות - חובה לבחור אחד מהערכים: "LOW", "MEDIUM", "HIGH", "CRITICAL"
   - apartmentNumber: מספר דירה אם רלוונטי
   - buildingName: שם הבניין אם צוין

4. workers (עובדים / אנשי מקצוע / טכנאים / عمال وفنيين):
   - name: שם העובד / בעל המקצוע
   - specialty: תחום התמחות (אינסטלציה, חשמל, צבע, ניקיון, מעליות, גז וכו')
   - phone: טלפון
   - email: אימייל

5. suppliers (ספקים / חברות נותנות שירות / موردين):
   - name: שם הספק / החברה
   - category: תחום פעילות או אספקה
   - phone: טלפון
   - email: אימייל

6. inventory (מלאי / פריטים / ציוד / מחסן / مخزון וציוד):
   - name: שם הפריט
   - quantity: כמות (מספר)
   - sku: מק"ט או ברקוד אם קיים
   - location: מיקום במחסן או בבניין
   - buildingName: שם הבניין אם רלוונטי

7. invoices (חשבוניות / קבלות / הוצאות / فواتיר):
   - invoiceNumber: מספר חשבונית / קבלה
   - supplierName: שם הספק או המוטב
   - amount: סכום לתשלום (מספר)
   - date: תאריך בפורמט YYYY-MM-DD אם קיים
   - buildingName: שם הבניין

כללים חשובים:
- זהה שמות בעברית ובערבית (למשל: أحمد, محمد, יוסי, דני, חאלד).
- אם המידע לא כולל קטגוריה מסוימת, השאר את המערך ריק [].
- החזר JSON תקני בלבד התואם לפורמט הנדרש.

טקסט לניתוח:
"""
${text || '(אין טקסט ישיר, נתח על בסיס התמונות המצורפות)'}
"""
`;

        const parts: any[] = [];
        // Add images if provided
        for (const img of images) {
            parts.push({
                inlineData: {
                    data: img.base64Data,
                    mimeType: img.mimeType,
                }
            });
        }
        parts.push({ text: promptText });

        const response = await client.models.generateContent({
            model: modelToUse,
            contents: { parts },
            config: {
                responseMimeType: "application/json",
            }
        });

        let jsonStr = (response.text || '').trim();
        const jsonMatch = jsonStr.match(/```(?:json)?([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonStr = jsonMatch[1];
        }

        const parsed = JSON.parse(jsonStr) as SmartImportEntityResult;
        return {
            tenants: Array.isArray(parsed.tenants) ? parsed.tenants : [],
            buildings: Array.isArray(parsed.buildings) ? parsed.buildings : [],
            issues: Array.isArray(parsed.issues) ? parsed.issues : [],
            workers: Array.isArray(parsed.workers) ? parsed.workers : [],
            suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
            inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
            invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
        };
    } catch (error) {
        console.error("Error in smartExtractEntitiesWithAi:", error);
        throw formatAiError(error);
    }
};

