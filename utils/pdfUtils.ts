import * as pdfjsLib from 'pdfjs-dist';

// Setting the worker source is crucial for pdf.js to work in various environments.
// This points to the version specified in the import map in index.html.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;

/**
 * Converts a PDF file (as a data URL) into an array of image data URLs.
 * @param pdfDataUrl The base64 data URL of the PDF file.
 * @returns A promise that resolves to an array of JPEG image data URLs.
 */
export async function convertPdfToImages(pdfDataUrl: string): Promise<string[]> {
    // Decode base64 data, removing the 'data:application/pdf;base64,' prefix
    const pdfData = atob(pdfDataUrl.substring(pdfDataUrl.indexOf(',') + 1));
    
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    const images: string[] = [];
    const numPages = pdf.numPages;
    
    // Render each page to a canvas and get its data URL
    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        // Using a scale of 1.5 provides a good balance of quality and performance
        const viewport = page.getViewport({ scale: 1.5 }); 
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not get canvas context for PDF rendering.');
        }
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderTask = page.render({
            canvasContext: context,
            viewport: viewport,
        } as any); // Use 'as any' to bypass a potentially incorrect type definition
        await renderTask.promise;
        
        // Use JPEG for smaller file sizes compared to PNG
        images.push(canvas.toDataURL('image/jpeg', 0.9)); 
    }
    
    return images;
}

/**
 * Converts a PDF file (as a data URL) into a single text string.
 * @param pdfDataUrl The base64 data URL of the PDF file.
 * @returns A promise that resolves to a string containing all text from the PDF.
 */
export async function convertPdfToText(pdfDataUrl: string): Promise<string> {
    const pdfData = atob(pdfDataUrl.substring(pdfDataUrl.indexOf(',') + 1));
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // The 'str' property exists on TextItem but not on TextMarkedContent.
        // We need to check for its existence before accessing it.
        const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
        fullText += pageText + '\n\n'; // Add newlines between pages
    }
    
    return fullText;
}