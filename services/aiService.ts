
import { GoogleGenAI, Type } from "@google/genai";
import { Problem, FormTemplate, ProblemSeverity, Tenant, Supplier, Quotation, QuotationStatus } from '../types';

let ai: GoogleGenAI;

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
 * @param base64Image The base64 encoded image data (without the data URL prefix).
 * @param mimeType The MIME type of the image (e.g., 'image/jpeg').
 * @returns A promise that resolves to the generated text description.
 */
export const generateDescriptionFromImage = async (base64Image: string, mimeType: string): Promise<string> => {
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
            model: 'gemini-2.5-flash',
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

export const generateReportFromPdf = async (text: string, images: string[]): Promise<{ title: string; date: string; description: string; problems: Partial<Problem>[] }> => {
    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: 'gemini-2.5-pro',
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

export const generateFormTemplateFromPdfText = async (text: string): Promise<Partial<FormTemplate>> => {
    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: 'gemini-2.5-pro',
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

export const generateReportSummary = async (problems: Problem[]): Promise<string> => {
    const problemDescriptions = problems.map(p => `- ${p.description} (Severity: ${p.severity})`).join('\n');
    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Based on the following list of problems, write a concise executive summary for a report. Problems:\n${problemDescriptions}`,
        });
        return (response.text || '').trim();
    } catch (error) {
        console.error("Error generating report summary:", error);
        throw new Error("Failed to generate report summary using AI.");
    }
};

export const generateTenantsFromText = async (text: string): Promise<Partial<Tenant>[]> => {
    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Parse the following text from a PDF/CSV into a JSON array of tenants. Text: "${text}"`,
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

export const generateSuppliersFromText = async (text: string): Promise<Partial<Supplier>[]> => {
    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Parse the following text from a PDF/CSV into a JSON array of suppliers. Text: "${text}"`,
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


export const generateQuotationsFromText = async (text: string): Promise<Partial<Quotation>[]> => {
    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Your task is to parse text from a CSV or Excel file and convert it into a JSON array of quotations. The data is in Hebrew.

            **Instructions:**
            1.  **Column Mapping:** Identify and extract data from the following columns. The column names might have slight variations.
                - \`quotationName\`: from 'תיאור הצעת המחיר'
                - \`quotationNumber\`: from "מס' הצעה"
                - \`invoiceNumber\`: from "מס' חשבונית"
                - \`price\`: from 'מחיר'
                - \`group\`: from 'תחום'
                - \`supplierName\`: from 'חברה'
                - \`projectName\`: from 'בניין'
                - \`date\`: from 'תאריך אישור'
                - \`status\`: from 'סטטוס'
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
