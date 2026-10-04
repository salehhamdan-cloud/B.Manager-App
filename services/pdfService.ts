import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    AppSettings, ReportPdfGenerationOptions, FormPdfGenerationOptions, ChecklistPdfGenerationOptions, InventoryPdfOptions,
    Project, Report,
    Tenant, TenantWithContext, Supplier, Quotation, AnnotatedImage, FormWithContext, QuotationStatus, ProblemWithContext, TodoWithContext,
    ProjectFile, FileWithContext, InventoryItemWithContext, TaskDuration, Worker, WorkerWithContext,
    NotesPdfGenerationOptions,
    ElectricalToolsPdfOptions,
    OrderListPdfOptions,
    AllSubProjectsPdfOptions,
    SubProjectDetailPdfOptions,
    InventoryItem,
    SubProject,
    SubProjectWithContext,
    ProjectTodo,
    ProjectForm,
    FormTemplate,
    FormAnswer
} from '../types';
import { SEVERITY_COLORS } from '../constants';
import { formatDate, formatDateTime, getFileValidityStatus } from '../utils/dateFormatter';

const FAILED_IMAGE_PLACEHOLDER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAPFJREFUeF7t0EENwDAAAmbA/08eI4MMBEaHH3g27M50JgJFCJRIoBKBRAKVCKQSKESgEgGVCKRKoBABlQikSqASgUQEUCWQSASiCCQSiEIgEQFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEGEiABFAqkEKkSgEgGVCKQSKESgEgGVCKRKoBABlQikSqASgUQEUCWQSAQifwA5bA8+51lEVAAAAABJRU5ErkJggg==';

// Base64 encoded Heebo-Regular.ttf font to ensure offline availability and fix rendering issues.
const HEEBO_REGULAR_BASE64 = "AAEAAAAQAQAABAAAR0RFRgB4AfQAAEdEAAAHeEdQT1PyExZPAABHRAAAG3pHU1VCAa8dpwAAeGQAAE9TLzLC8aQFAAAFsAAAAGBjbWFwAE8LegAABxQAAAIwY3Z0IAAiAfsAAEGgAAAAGmdhc3AAAAAQAAHkAAAAEGdseWY1P6hNAAEgKAAAEGhoZWFkBWsI2wAAADcAAAA2aGhlYQfsA9gAAAA8AAAACBobXR4AoUAAQAAfWwAAARoa2VybgH4AUEAAH2cAAJnaWxvY2EABAAJAAAmoAAABmFhbnUAZQBkAAABeAAAAAhwb3N0AAMAAAAAAmoAAAACAAABAAAAAQAAa72vGF8PPPUACwQAAAAAAN/9i9kAAAAA3/2L2QAB/4YDcAN/AAAACAACAAAAAAAAAAEAAACf/YgAAM3/YYDcAN/AAEAAAAAAAAAAAAAAAAAAADWAAEAAAAAAAB3AAEAAAAAAADWAAMAWwAFAAEAAAAAAEYABwAAAAAABAIAAAEAAAAA3wADAAEECQABACgABgADAAEECQACAA4ACwADAAEECQADADgAEgADAAEECQAEACgAFgADAAEECQAFADYAGgADAAEECQAGACgAHAEDAAMAADwAAAAEAAAAAwAAKAAAFAADADwADgAMAAD/wAAeAAAAADwAAAAEAAAAAAAAAAAAAABodHRwOi8vd3d3Lm9wZW50eXBlLm9yZwBIdHRwczovL2dpdGh1Yi5jb20vZ29vZ2xlZm9udHMvaGVlYm8AVjIuMC41ADtib2xkADtkaXNwbGF5ADt0ZXh0AEhlZWJvLVJlZ3VsYXIAT21lZ2EgQWxwaGEAVgBlAHIAcwBpAG8AbgAgADIALgAwAC4ANQA7ACAASQBzACAAQwByAGUAYQB0AGUAZAAgAEIAeQAgAE8AbQBlAGcAIAAQAEgAZQBlAGIAbwAgAFIAZQBnAHUAbABhAHIAIABOAGkAbQAgAEgAZQBlAGIAbwAgAEgAZQBlAGIAbwBSAGUAZwB1AHwAYQByAEIAZQBuACAASABhAGcAZQByACwAIABEAGEAbgBpAGUAbAAgAEIAZQByAGsAbwB3AGkAegAIAEEAcgBpAGUAbAAgAEcAbwB0AGgAaQBjACAASABFAEYAbwBuAHQAQwBvAG4AdAByAGkAYgB1AHQAaQBvAG4ALAAgAFMAaQBsAHcAYQB5ACAARgBvAHUAbgBkAHIAeQAgACgAaAB0AHQAcAA6AC8ALwBzAGMAcgBpAHAAdABzAC4AcwBpAGwALgBvAHIAZwAvAEMAUgAvAE8ARgBMAEAAKQAIAEMAaQB0AGEAZABlAGwALABzAHUAZAAgAEMAYQBsAGEAbgBkAHIAaQBhACAAMQAyACAAZgBvAG4AdABzACAAYgB5ACAAQQByAGkAYQBuAGEAIABWAGkAbgBjAG8AdQByAAgAQQBCAEUAWwBbAEIAYQBkAGEAZABlAFsAWwBDAEMAXQBkAGEAZABlAFsAIAAxACAAMgAgAGEAIAAwAFwAXQBdAGEAIAAwADEAMgA5AFsAWwAxADIANwBbAEIAZgBbAEIAbABbAEIAcQBkAGEAZABlAFsAXQBfAF4AYABgAGEAYQBiAGMAYwBkAGQAZQBlAGYAZgBnAGcAaABpAGoAawBsAG0AbgBvAHAAcQByAHMAdAB1AHYAdwB4AHkAegB7AHwAfQB+AIQAjgCEAI4AhADqAI4AhADqAI4AhADqAI4AhADqAI4AhACAAIwAigCMAIoAjACGAJAAkgCSAJIAkACOAJAAlACSAJQAogCUAJYAogCWAKoAogCqALoAogC6AOoAugDOAJAAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB0AGoAdABqAHQAagB-";
const FONT_NAME_FALLBACK = 'Helvetica';
const FONT_NAME_HEBREW = 'Heebo';
let currentFontName = FONT_NAME_FALLBACK;
let defaultHebrewFontLoaded = false; // Flag to prevent re-fetching font on each PDF generation

// Helper to convert array buffer to binary string for jsPDF's VFS
function arrayBufferToBinaryString(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return binary;
}

/**
 * A robust BiDi text processing function for RTL text with LTR segments (like numbers and English).
 * It splits the text into logical segments, reverses the order of segments for an LTR renderer,
 * and then reverses the characters within each RTL segment to ensure they are readable.
 * Numbers and English words are treated as LTR and are not reversed internally.
 * @param text The logical string to process.
 * @returns A visually correct string ready for LTR rendering.
 */
const processBidiText = (text: string): string => {
    if (text === null || text === undefined) return '';
    const str = String(text);

    // If the string does not contain any RTL characters, return it as is.
    const isRtl = /[\u0590-\u05FF]/.test(str);
    if (!isRtl) {
        return str;
    }
    
    // Sanitize and process for BiDi rendering.
    // This regex groups RTL characters, LTR characters (including numbers and punctuation), and neutral characters separately.
    const segments = str.match(/[\u0590-\u05FF]+|[a-zA-Z0-9.,\/\-₪$€%:[\]{}()]+|[^\u0590-\u05FFa-zA-Z0-9.,\/\-₪$€%:[\]{}()]+/g) || [];

    const reversedSegments = segments.reverse().map(segment => {
        // Only reverse the characters within pure RTL (Hebrew) segments.
        if (/^[\u0590-\u05FF]+$/.test(segment)) {
            return segment.split('').reverse().join('');
        }
        // LTR segments and neutral characters are not reversed internally.
        return segment;
    });

    return reversedSegments.join('');
};

/**
 * Pre-loads all required images as HTMLImageElement objects.
 * This is more robust against CORS issues by leveraging the browser's native image loading.
 * @param urls An array of image URLs or data URLs.
 * @returns A promise that resolves to an object containing a map of loaded images and a list of URLs that failed.
 */
const preloadImages = async (urls: (string | undefined)[]): Promise<{ imageCache: Map<string, HTMLImageElement>, failedUrls: string[] }> => {
    const uniqueUrls = [...new Set(urls.filter(Boolean))] as string[];
    const imageCache = new Map<string, HTMLImageElement>();
    const failedUrls: string[] = [];

    const promises = uniqueUrls.map(url => new Promise<void>(resolve => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        img.onload = () => {
            imageCache.set(url, img);
            resolve();
        };

        img.onerror = () => {
            failedUrls.push(url);
            const placeholder = new Image();
            placeholder.src = FAILED_IMAGE_PLACEHOLDER;
            placeholder.onload = () => {
                imageCache.set(url, placeholder);
                resolve();
            }
            placeholder.onerror = () => resolve();
        };

        img.src = url;
    }));

    await Promise.all(promises);
    return { imageCache, failedUrls };
};

const getSimpleFileStatusForPdf = (dueDateString?: string): string => {
    if (!dueDateString) return 'אין תאריך';
    const dueDate = new Date(dueDateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'פג תוקף'; // EXPIRED
    if (diffDays <= 30) return 'פג בקרוב'; // EXPIRED SOON
    return 'בתוקף'; // VALID
};

class PdfBuilder {
    public doc: jsPDF;
    public settings: AppSettings;
    public yPos: number;
    public pageWidth: number;
    public pageHeight: number;
    public margin: number;
    public imageCache: Map<string, HTMLImageElement>;

    constructor(settings: AppSettings, imageCache: Map<string, HTMLImageElement>) {
        this.settings = settings;
        this.imageCache = imageCache;
        this.margin = 40;

        this.doc = new jsPDF({
            orientation: settings.pdfOrientation || 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        this.pageWidth = this.doc.internal.pageSize.getWidth();
        this.pageHeight = this.doc.internal.pageSize.getHeight();
        this.yPos = this.margin;
    }
    
    async initializeFont() {
      // 1. Try user's custom font
      if (this.settings.customFontUrl && this.settings.customFontName) {
          try {
              const fontNameForVFS = this.settings.customFontName.replace(/[^a-zA-Z0-9]/g, '');
              const response = await fetch(this.settings.customFontUrl);
              if (!response.ok) throw new Error(`Custom font file not found.`);
              const fontBuffer = await response.arrayBuffer();
              const binaryFont = arrayBufferToBinaryString(fontBuffer);
              
              this.doc.addFileToVFS(`${fontNameForVFS}.ttf`, binaryFont);
              this.doc.addFont(`${fontNameForVFS}.ttf`, fontNameForVFS, 'normal');
              this.doc.addFont(`${fontNameForVFS}.ttf`, fontNameForVFS, 'bold');
              
              this.doc.setFont(fontNameForVFS);
              currentFontName = fontNameForVFS;
              return;
          } catch (error) {
              console.error("Failed to load custom font, falling back to default Hebrew font:", error);
          }
      }

      // 2. Try default Hebrew font from embedded Base64
      try {
          if (!defaultHebrewFontLoaded) {
            this.doc.addFileToVFS(`${FONT_NAME_HEBREW}.ttf`, atob(HEEBO_REGULAR_BASE64));
            this.doc.addFont(`${FONT_NAME_HEBREW}.ttf`, FONT_NAME_HEBREW, 'normal');
            this.doc.addFont(`${FONT_NAME_HEBREW}.ttf`, FONT_NAME_HEBREW, 'bold');
            defaultHebrewFontLoaded = true; // Set flag after successful load
          }
          this.doc.setFont(FONT_NAME_HEBREW);
          currentFontName = FONT_NAME_HEBREW;
          return;
      } catch (error) {
          console.error("Failed to load embedded Hebrew font, falling back to Helvetica:", error);
          defaultHebrewFontLoaded = false; // Reset flag on failure
      }

      // 3. Fallback to Helvetica
      this.doc.setFont(FONT_NAME_FALLBACK);
      currentFontName = FONT_NAME_FALLBACK;
    }

    public addHeader(reportTitle: string) {
        const headerHeight = 60;
        const padding = 10;
        const logoUrl = this.settings.companyInfo.url || this.settings.companyInfo.logo;
    
        this.doc.setFillColor(this.settings.pdfTheme.headerColor);
        this.doc.rect(0, 0, this.pageWidth, headerHeight, 'F');
        this.doc.setTextColor(this.settings.pdfTheme.headerTextColor);
        this.doc.setFontSize(this.settings.fontSizeLarge);
        this.doc.setFont(currentFontName, 'bold');
    
        // Draw report title in the center
        this.drawText(reportTitle, this.pageWidth / 2, headerHeight / 2 + 7, { align: 'center' });
    
        // Draw logo
        if (logoUrl) {
            const logoImg = this.imageCache.get(logoUrl);
            if (logoImg) {
                let logoWidth = (this.pageWidth * this.settings.logoSize) / 100;
                let logoHeight = (logoImg.height * logoWidth) / logoImg.width;

                if (logoHeight > headerHeight - (padding * 2)) {
                    logoHeight = headerHeight - (padding * 2);
                    logoWidth = (logoImg.width * logoHeight) / logoImg.height; // Recalculate width to maintain aspect ratio
                }
                
                const logoPosition = this.settings.logoPosition || 'top-right';
                let logoX = this.margin;
                if (logoPosition === 'top-right') {
                    logoX = this.pageWidth - this.margin - logoWidth;
                } else if (logoPosition === 'top-center') {
                     logoX = (this.pageWidth - logoWidth) / 2;
                }
                
                const logoY = (headerHeight - logoHeight) / 2; // Vertically center the logo in the header
                this.doc.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight);
            }
        }
        
        this.doc.setFont(currentFontName, 'normal');
    }
    
    public addFooter(pageNumber: number, totalPages: number) {
        this.doc.setFontSize(this.settings.fontSizeSmall);
        this.doc.setTextColor(this.settings.pdfTheme.textColor);
        const pageNumText = `עמוד ${pageNumber} מתוך ${totalPages}`;
        this.drawText(pageNumText, this.pageWidth / 2, this.pageHeight - this.margin / 2, { align: 'center' });
    }

    public checkPageBreak(requiredHeight: number) {
        if (this.yPos + requiredHeight > this.pageHeight - this.margin) {
            this.addPage();
        }
    }

    public addPage() {
        this.doc.addPage();
        this.yPos = 100;
    }

    public finalize(reportTitle: string, fileName: string) {
        const pageCount = this.doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            this.doc.setPage(i);
            this.addHeader(reportTitle);
            this.addFooter(i, pageCount);
        }
        this.doc.save(`${fileName}.pdf`);
    }

    public drawText(text: string | null | undefined, x: number, y: number, options: any = {}) {
        const textToDraw = options.noBidi ? String(text || '') : processBidiText(String(text || ''));
        this.doc.text(textToDraw, x, y, options);
    }
    
    public drawHeading(text: string, y?: number) {
        const yPos = y || this.yPos;
        this.doc.setFontSize(this.settings.fontSizeLarge);
        this.doc.setFont(currentFontName, 'bold');
        this.doc.setTextColor(this.settings.pdfTheme.textColor);
        
        const processedText = processBidiText(text);
        const textDimensions = this.doc.getTextDimensions(processedText);
        const textWidth = textDimensions.w;

        this.drawText(text, this.pageWidth - this.margin, yPos, { align: 'right' });
        
        this.doc.setDrawColor(this.settings.pdfTheme.borderColor);
        this.doc.setLineWidth(1);
        this.doc.line(this.pageWidth - this.margin - textWidth, yPos + 3, this.pageWidth - this.margin, yPos + 3);

        this.yPos = yPos + textDimensions.h + 15;
        this.doc.setFont(currentFontName, 'normal');
    }

    public drawTable(head: string[][], body: (string | number)[][], options: any = {}) {
        // Combine all options, ensuring our defaults are applied but can be overridden.
        const finalOptions = {
            theme: 'grid',
            styles: { font: currentFontName, cellPadding: 5, textColor: this.settings.pdfTheme.textColor, fontStyle: 'normal' },
            headStyles: { fillColor: this.settings.pdfTheme.headerColor, textColor: this.settings.pdfTheme.headerTextColor, fontStyle: 'bold', halign: 'right' },
            bodyStyles: { halign: 'right' },
            alternateRowStyles: { fillColor: '#f8fafc' },
            repeatHeader: true,
            ...options, // Spread user options
            head: head,
            body: body,
            startY: options.startY !== undefined ? options.startY : this.yPos,
            margin: {
                top: 100, 
                right: this.margin, 
                bottom: 60, 
                left: this.margin, 
                ...options.margin 
            },
        };
        
        // Final enforcement of the top margin to ensure spacing from the header.
        finalOptions.margin.top = 100;
        
        // Ensure BiDi text processing is always applied, even if user passes custom hooks.
        const originalDidParseCell = options.didParseCell;
        finalOptions.didParseCell = (data: any) => {
            const text = Array.isArray(data.cell.text) ? data.cell.text : [String(data.cell.text)];
            data.cell.text = text.map((t: string) => {
                if (data.column.dataKey === 0 && data.section === 'head' && t === 'סטטוס') return t;
                if (/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(t)) {
                    return t;
                }
                return processBidiText(t);
            });
            if (originalDidParseCell) {
                originalDidParseCell(data);
            }
        };
    
        autoTable(this.doc, finalOptions as any);
        this.yPos = (this.doc as any).lastAutoTable.finalY + 20;
    }

    public drawImageWithCaption(imgSrc: string | undefined, caption: string | undefined, options: { sizePercent?: number; align?: 'center' | 'right' | 'left' } = {}) {
        if (!imgSrc) return;
        const imageElement = this.imageCache.get(imgSrc);
        if (!imageElement) return;

        const sizePercent = options.sizePercent || this.settings.problemImageSize || 40;
        const align = options.align || 'center';

        try {
            const availableWidth = this.pageWidth - this.margin * 2;
            const imgWidth = availableWidth * (sizePercent / 100);
            const imgHeight = (imageElement.height * imgWidth) / imageElement.width;
            
            const captionHeight = caption ? this.doc.getTextDimensions(processBidiText(caption), { fontSize: this.settings.fontSizeSmall, maxWidth: imgWidth }).h + 10 : 0;
            
            this.checkPageBreak(imgHeight + captionHeight);
            
            let x;
            if (align === 'right') x = this.pageWidth - this.margin - imgWidth;
            else if (align === 'left') x = this.margin;
            else x = (this.pageWidth - imgWidth) / 2;
            
            this.doc.addImage(imageElement, 'JPEG', x, this.yPos, imgWidth, imgHeight);
            this.yPos += imgHeight;
            
            if (caption) {
                this.doc.setFontSize(this.settings.fontSizeSmall);
                this.doc.setTextColor(this.settings.pdfTheme.textColor);
                this.drawText(caption, x + imgWidth / 2, this.yPos + 10, { align: 'center', maxWidth: imgWidth });
                this.yPos += captionHeight + 10;
            } else {
                this.yPos += 10;
            }
        } catch (e) { console.error("Error adding image to PDF:", e); }
    }

    public drawProjectDetailsPage(project: Project, report?: Report) {
        this.yPos = 80;
    
        const mainTitle = report ? report.title : project.name;
        this.doc.setFontSize(this.settings.fontSizeLarge + 6);
        this.doc.setFont(currentFontName, 'bold');
        this.drawText(mainTitle, this.pageWidth / 2, this.yPos, { align: 'center' });
        this.yPos += 40;
        this.doc.setFont(currentFontName, 'normal');
    
        const projectImageUrl = project.images[0]?.url || project.images[0]?.dataUrl;
        const imagePosition = this.settings.projectImagePosition || 'below-header';
    
        const detailsBody: [string, string][] = [];
        detailsBody.push(['שם פרויקט', project.name]);
        detailsBody.push(['כתובת', project.address]);
        detailsBody.push(['פרטי לקוח', project.clientInfo]);
    
        if (project.managerName) {
            detailsBody.push(['מנהל בניין', project.managerName]);
        }
        if (project.managerPhone) {
            detailsBody.push(['טלפון מנהל', project.managerPhone]);
        }
        if (project.managerEmail) {
            detailsBody.push(['מייל מנהל', project.managerEmail]);
        }
        
        if (report) {
            detailsBody.push(['תאריך הדוח', formatDate(report.date)]);
        }

        // Always add reporter info
        detailsBody.push(['שם מחבר', this.settings.authorName]);
        if (this.settings.authorPhone) {
            detailsBody.push(['טלפון מחבר', this.settings.authorPhone]);
        }
        if (this.settings.authorEmail) {
            detailsBody.push(['מייל מחבר', this.settings.authorEmail]);
        }
    
        const headingText = report ? 'פרטי הדוח והפרויקט' : 'פרטי הפרויקט';
    
        if (imagePosition === 'below-header') {
            this.drawImageWithCaption(projectImageUrl, undefined, { sizePercent: this.settings.projectImageSize, align: 'center' });
            this.yPos += 20;
            this.drawHeading(headingText);
            this.doc.setFont(currentFontName, 'normal');
            this.doc.setFontSize(this.settings.fontSizeMedium);
            detailsBody.forEach(row => {
                const detailText = `${row[0]}: ${row[1]}`;
                const textLines = this.doc.splitTextToSize(processBidiText(detailText), this.pageWidth - this.margin * 2);
                const textHeight = textLines.length * (this.settings.fontSizeMedium * 1.15);
                this.checkPageBreak(textHeight + 5);
                this.drawText(detailText, this.pageWidth - this.margin, this.yPos, { align: 'right', maxWidth: this.pageWidth - this.margin * 2 });
                this.yPos += textHeight + 5;
            });
            this.yPos += 10;
        } else { // top-right or top-left
            this.drawHeading(headingText);
            let tableMargin = { left: this.margin, right: this.margin };
            let tableStartY = this.yPos;
            let minFinalY = 0;
    
            if (projectImageUrl) {
                const imageElement = this.imageCache.get(projectImageUrl);
                if (imageElement) {
                    const availableWidth = this.pageWidth - this.margin * 2;
                    const sizePercent = this.settings.projectImageSize || 30;
                    const imgWidth = availableWidth * (sizePercent / 100);
                    const imgHeight = (imageElement.height * imgWidth) / imageElement.width;
                    
                    minFinalY = this.yPos + imgHeight;
                    let imageX;
    
                    if (imagePosition === 'top-right') {
                        imageX = this.pageWidth - this.margin - imgWidth;
                        tableMargin = { left: this.margin, right: this.margin + imgWidth + 20 };
                    } else { // top-left
                        imageX = this.margin;
                        tableMargin = { left: this.margin + imgWidth + 20, right: this.margin };
                    }
                    this.checkPageBreak(imgHeight + 20);
                    this.doc.addImage(imageElement, 'JPEG', imageX, this.yPos, imgWidth, imgHeight);
                }
            }
    
            const rtlDetailsBody = detailsBody.map(row => [row[1], row[0]]);
    
            autoTable(this.doc, {
                startY: tableStartY,
                body: rtlDetailsBody,
                theme: 'plain',
                styles: { font: currentFontName, cellPadding: 3, textColor: this.settings.pdfTheme.textColor },
                bodyStyles: { halign: 'right' },
                columnStyles: { 1: { fontStyle: 'bold' } },
                margin: { ...tableMargin, top: 100 },
                didParseCell: (data: any) => {
                    data.cell.text = [processBidiText(String(data.cell.raw))];
                }
            });
            
            const tableFinalY = (this.doc as any).lastAutoTable.finalY;
            this.yPos = Math.max(tableFinalY, minFinalY) + 20;
        }
    }
    
    public drawPhotoGrid(images: AnnotatedImage[], itemLabel: string, options: { showHeader?: boolean } = { showHeader: true }) {
        if (!images || images.length === 0) return;
    
        const imagesPerRow = 3;
        const padding = 10;
        const availableWidth = this.pageWidth - this.margin * 2;
        const boxSize = (availableWidth - (padding * (imagesPerRow - 1))) / imagesPerRow; // Square box
    
        if (options.showHeader) {
            const captionText = `תמונות לשאלה: ${itemLabel}`;
        
            // Add a styled header for the photo section
            this.yPos += 5;
            this.doc.setFontSize(this.settings.fontSizeSmall);
            this.doc.setTextColor(this.settings.pdfTheme.textColor);
            this.doc.setFillColor(this.settings.pdfTheme.formPhotoHeaderColor);
            this.doc.rect(this.margin, this.yPos, availableWidth, 20, 'F');
            this.doc.setTextColor(this.settings.pdfTheme.formPhotoHeaderTextColor || '#FFFFFF');
            this.drawText(captionText, this.pageWidth / 2, this.yPos + 14, { align: 'center' });
            this.yPos += 25;
        }
    
        for (let i = 0; i < images.length; i += imagesPerRow) {
            const rowImages = images.slice(i, i + imagesPerRow);
            
            this.checkPageBreak(boxSize + 10);
    
            let currentX = this.pageWidth - this.margin;
    
            for (const [index, photo] of rowImages.entries()) {
                currentX -= boxSize;
    
                const imgSrc = photo.url || photo.dataUrl;
                if (!imgSrc) continue;
    
                const imageElement = this.imageCache.get(imgSrc);
                if (!imageElement) continue;
    
                // Stretch image to fill the container, ignoring aspect ratio.
                this.doc.addImage(imageElement, 'JPEG', currentX, this.yPos, boxSize, boxSize);
    
                if (index < rowImages.length - 1) {
                    currentX -= padding;
                }
            }
            
            this.yPos += boxSize + 10;
        }
    }

    public drawForm(formWithTemplate: { form: ProjectForm; template: FormTemplate }) {
        const { form, template } = formWithTemplate;
        const { pdfTheme, fontSizeLarge, fontSizeMedium, fontSizeSmall } = this.settings;
    
        this.doc.setFillColor(pdfTheme.formTitleHeaderColor);
        this.doc.rect(this.margin, this.yPos, this.pageWidth - this.margin * 2, 35, 'F');
        this.doc.setTextColor(pdfTheme.formTitleTextColor);
        this.doc.setFontSize(fontSizeLarge);
        this.drawText(template.name, this.pageWidth / 2, this.yPos + 24, { align: 'center' });
        this.yPos += 50;
    
        const availableWidth = this.pageWidth - this.margin * 2;
        const columnStyles = {
            // REVERSED ORDER for correct RTL visual layout
            0: { cellWidth: availableWidth * 0.30 }, // Comments
            1: { cellWidth: availableWidth * 0.20 }, // Answer
            2: { cellWidth: availableWidth * 0.50 }, // Question
        };
    
        for (const group of template.groups) {
            this.checkPageBreak(80); 
            this.doc.setFontSize(fontSizeMedium + 2);
            this.doc.setFont(currentFontName, 'bold');
            this.doc.setTextColor(pdfTheme.textColor);
            this.doc.setFillColor(pdfTheme.formGroupHeaderColor);
            this.doc.rect(this.margin, this.yPos, availableWidth, 28, 'F');
            this.drawText(group.name, this.pageWidth - this.margin - 5, this.yPos + 20, { align: 'right' });
            this.yPos += 38;
    
            for (const [index, item] of group.items.entries()) {
                const answer = form.answers.find((a: FormAnswer) => a.formItemId === item.id);
                const value = answer?.value;
                let displayValue = '-';
                if (typeof value === 'boolean') displayValue = value ? 'כן' : 'לא';
                else if (value === 'ok') displayValue = 'תקין';
                else if (value === 'not-ok') displayValue = 'לא תקין';
                else if (value === 'na') displayValue = 'לא רלוונטי';
                else if (item.type === 'date' && value) {
                    displayValue = formatDate(String(value));
                }
                else if (value) displayValue = String(value);
                
                let totalBlockHeight = 0;
                const textPadding = 5 * 2;
                const fontSize = this.settings.fontSizeMedium;
    
                const questionText = this.doc.splitTextToSize(processBidiText(item.label), columnStyles[2].cellWidth - textPadding);
                const answerText = this.doc.splitTextToSize(processBidiText(displayValue), columnStyles[1].cellWidth - textPadding);
                const commentsText = this.doc.splitTextToSize(processBidiText(answer?.description || ''), columnStyles[0].cellWidth - textPadding);
                const maxLines = Math.max(questionText.length, answerText.length, commentsText.length);
                const textRowHeight = (maxLines * fontSize * 1.15) + textPadding;
                totalBlockHeight += textRowHeight;
                if(index === 0) {
                    const headerHeight = (1 * fontSize * 1.15) + textPadding;
                    totalBlockHeight += headerHeight;
                }
    
                const photos = answer?.photos || [];
                if (photos.length > 0) {
                    const imagesPerRow = 3;
                    const padding = 10;
                    const boxSize = (availableWidth - (padding * (imagesPerRow - 1))) / imagesPerRow;
                    const numRows = Math.ceil(photos.length / imagesPerRow);
                    totalBlockHeight += 25 + 5;
                    totalBlockHeight += numRows * (boxSize + 10);
                }
                
                this.checkPageBreak(totalBlockHeight);
    
                autoTable(this.doc, {
                    startY: this.yPos,
                    head: index === 0 ? [['הערות', 'תשובה', 'שאלה']] : undefined,
                    body: [[answer?.description || '', displayValue, item.label]],
                    theme: 'grid',
                    styles: { font: currentFontName, cellPadding: 5, textColor: pdfTheme.textColor, fontSize: fontSize },
                    headStyles: { fillColor: pdfTheme.formGroupHeaderColor, textColor: pdfTheme.textColor, fontStyle: 'bold', halign: 'right' },
                    bodyStyles: { halign: 'right' },
                    margin: { top: 100 },
                    didParseCell: (data: any) => {
                        data.cell.text = [processBidiText(String(data.cell.raw))];
                    },
                    columnStyles: columnStyles,
                });
                this.yPos = (this.doc as any).lastAutoTable.finalY;
    
                if (photos.length > 0) {
                    this.drawPhotoGrid(photos, item.label);
                }
            }
            this.yPos += 10;
        }
    
        const hasReporterSection = !!form.reporterComments || !!form.reporterSignature?.dataUrl || !!form.reporterSignature?.url;
        const hasManagerSection = !!form.managerComments || !!form.managerSignature?.dataUrl || !!form.managerSignature?.url;
    
        if (hasReporterSection || hasManagerSection) {
            this.yPos += 20; // Add space before signatures section
            this.checkPageBreak(120);
            this.drawHeading('סיכום וחתימות');

            const startY = this.yPos;
            let finalY = startY;
            const availableWidth = this.pageWidth - this.margin * 2;
            const columnWidth = (availableWidth - 20) / 2; // Gutter of 20pt

            // Reporter Section (Right Column)
            if (hasReporterSection) {
                let currentY = startY;
                const startX = this.pageWidth - this.margin - columnWidth;

                this.doc.setFontSize(fontSizeMedium);
                this.doc.setFont(currentFontName, 'bold');
                this.drawText('הערות וחתימת מדווח', startX + columnWidth, currentY, { align: 'right' });
                currentY += 20;
                this.doc.setFont(currentFontName, 'normal');

                if (form.reporterComments) {
                    this.doc.setFontSize(fontSizeSmall);
                    const textLines = this.doc.splitTextToSize(processBidiText(form.reporterComments), columnWidth);
                    const textHeight = textLines.length * (fontSizeSmall * 1.15) + 10;
                    this.drawText(form.reporterComments, startX + columnWidth, currentY, { align: 'right', maxWidth: columnWidth });
                    currentY += textHeight;
                }

                if (form.reporterSignature) {
                    const sigUrl = form.reporterSignature.url || form.reporterSignature.dataUrl;
                    if (sigUrl) {
                        const sigImg = this.imageCache.get(sigUrl);
                        if (sigImg) {
                            const sigHeight = 50;
                            const sigWidth = Math.min(columnWidth, (sigImg.width * sigHeight) / sigImg.height);
                            const sigX = startX + columnWidth - sigWidth;
                            this.doc.addImage(sigImg, 'PNG', sigX, currentY, sigWidth, sigHeight);
                            currentY += sigHeight + 5;
                            // Date removed as per request
                        }
                    }
                }
                finalY = Math.max(finalY, currentY);
            }

            // Manager Section (Left Column)
            if (hasManagerSection) {
                let currentY = startY;
                const startX = this.margin;
                
                this.doc.setFontSize(fontSizeMedium);
                this.doc.setFont(currentFontName, 'bold');
                this.drawText('הערות וחתימת מנהל', startX + columnWidth, currentY, { align: 'right' });
                currentY += 20;
                this.doc.setFont(currentFontName, 'normal');

                if (form.managerComments) {
                    this.doc.setFontSize(fontSizeSmall);
                    const textLines = this.doc.splitTextToSize(processBidiText(form.managerComments), columnWidth);
                    const textHeight = textLines.length * (fontSizeSmall * 1.15) + 10;
                    this.drawText(form.managerComments, startX + columnWidth, currentY, { align: 'right', maxWidth: columnWidth });
                    currentY += textHeight;
                }

                if (form.managerSignature) {
                    const sigUrl = form.managerSignature.url || form.managerSignature.dataUrl;
                    if (sigUrl) {
                        const sigImg = this.imageCache.get(sigUrl);
                        if (sigImg) {
                            const sigHeight = 50;
                            const sigWidth = Math.min(columnWidth, (sigImg.width * sigHeight) / sigImg.height);
                            const sigX = startX + columnWidth - sigWidth;
                            this.doc.addImage(sigImg, 'PNG', sigX, currentY, sigWidth, sigHeight);
                            currentY += sigHeight + 5;
                            // Date removed as per request
                        }
                    }
                }
                finalY = Math.max(finalY, currentY);
            }

            this.yPos = finalY + 20;
        }
    }

    public drawWorkerDetails(worker: Worker | WorkerWithContext) {
        this.checkPageBreak(250); // Estimate height for a worker block
        
        this.drawHeading(worker.name);
        
        const detailsStartY = this.yPos;
        let photoFinalY = detailsStartY;
        const availableWidth = this.pageWidth - this.margin * 2;
    
        const photoUrl = worker.photo?.url || worker.photo?.dataUrl;
        if (photoUrl) {
            const imageElement = this.imageCache.get(photoUrl);
            if (imageElement) {
                const imgWidth = availableWidth * 0.30; // Use 30% of available width
                const imgHeight = (imageElement.height * imgWidth) / imageElement.width;
                this.checkPageBreak(imgHeight + 20);
                const imageX = this.margin; // Align photo to the left
                this.doc.addImage(imageElement, 'JPEG', imageX, this.yPos, imgWidth, imgHeight);
                photoFinalY = this.yPos + imgHeight;
            }
        }
        
        const personalDetails = [
            ['שם', worker.name],
            ['ת.ז', worker.idNumber],
            ['מספר עובד', worker.workerNumber],
            ['טלפון', worker.phone],
            ['מייל', worker.email],
            ['כתובת', worker.address],
        ].map(row => [row[1], row[0]]); // Reverse for RTL display
    
        autoTable(this.doc, {
            startY: detailsStartY,
            body: personalDetails,
            theme: 'plain',
            styles: { font: currentFontName, cellPadding: 2, fontSize: this.settings.fontSizeSmall },
            bodyStyles: { halign: 'right' },
            columnStyles: { 1: { fontStyle: 'bold' } },
            margin: { right: this.margin, left: this.margin + (availableWidth * 0.30) + 10, top: 100 },
            didParseCell: (data: any) => {
                data.cell.text = [processBidiText(String(data.cell.raw))];
            }
        });
    
        const tableFinalY = (this.doc as any).lastAutoTable.finalY;
        this.yPos = Math.max(photoFinalY, tableFinalY) + 20;
    
        // Permits and Licenses
        const permits: { name: string, validUntil?: string }[] = [];
        if (worker.workAtHeightPermit) permits.push({ name: 'היתר עבודה בגובה', validUntil: worker.workAtHeightPermit.validUntil });
        if (worker.safetyPermit) permits.push({ name: 'היתר בטיחות', validUntil: worker.safetyPermit.validUntil });
        worker.licenses.forEach(lic => permits.push({ name: lic.name, validUntil: lic.file?.validUntil }));
        
        if (permits.length > 0) {
            this.checkPageBreak(60); 
            
            this.drawTable(
                [['סטטוס', 'תוקף עד', 'שם היתר/רישיון']],
                permits.map(p => {
                    const status = getFileValidityStatus(p.validUntil);
                    return [status.text, p.validUntil ? formatDate(p.validUntil) : '-', p.name];
                })
            );
        }
        
        this.yPos += 20; // Space before next worker
    }
}

async function createPdfBuilderWithLogo(settings: AppSettings): Promise<PdfBuilder> {
    const logoUrl = settings.companyInfo.url || settings.companyInfo.logo;
    const { imageCache } = await preloadImages(logoUrl ? [logoUrl] : []);
    const builder = new PdfBuilder(settings, imageCache);
    await builder.initializeFont();
    return builder;
}


// EXPORTED FUNCTIONS
export const generatePdfFromImages = async (imageB64s: string[], fileName: string, settings: AppSettings): Promise<string> => {
    const builder = await createPdfBuilderWithLogo(settings);
    for (let i = 0; i < imageB64s.length; i++) {
        if (i > 0) builder.doc.addPage();
        try {
            const imgProps = builder.doc.getImageProperties(imageB64s[i]);
            const margin = 20;
            const availableWidth = builder.pageWidth - margin * 2, availableHeight = builder.pageHeight - margin * 2;
            const ratio = Math.min(availableWidth / imgProps.width, availableHeight / imgProps.height);
            const imgWidth = imgProps.width * ratio, imgHeight = imgProps.height * ratio;
            const x = (builder.pageWidth - imgWidth) / 2, y = (builder.pageHeight - imgHeight) / 2;
            builder.doc.addImage(imageB64s[i], 'JPEG', x, y, imgWidth, imgHeight);
        } catch (e) { console.error("Could not add image from scanner:", e); }
    }
    builder.finalize('סריקה', fileName);
    return builder.doc.output('datauristring');
};

export const generateReportPdf = async (options: ReportPdfGenerationOptions): Promise<{ failedImages: string[] }> => {
    const { settings, project, report, problems, allSuppliers, reportDashboardImageUrl, globalDashboard } = options;
    
    const imageUrls = [
        settings.companyInfo.url || settings.companyInfo.logo || '',
        project.images[0]?.url || project.images[0]?.dataUrl,
        ...problems.flatMap(p => p.images.map(i => i.url || i.dataUrl)),
        ...project.workers?.map(w => w.photo?.url || w.photo?.dataUrl) || [],
    ].filter(Boolean) as string[];

    const { imageCache, failedUrls } = await preloadImages(imageUrls);
    const builder = new PdfBuilder(settings, imageCache);
    await builder.initializeFont();

    // --- Details Page (First Page) ---
    builder.drawProjectDetailsPage(project, report);
    
    builder.checkPageBreak(50);
    builder.doc.setFontSize(settings.fontSizeMedium);
    builder.drawText(report.description, builder.pageWidth - builder.margin, builder.yPos, { align: 'right', maxWidth: builder.pageWidth - builder.margin * 2 });
    builder.yPos += builder.doc.getTextDimensions(processBidiText(report.description), { maxWidth: builder.pageWidth - builder.margin * 2 }).h + 20;
    
    // Global Dashboard
    if (globalDashboard && settings.pdfIncludeDashboard) {
        builder.addPage();
        builder.drawHeading('סיכום כללי (Dashboard)');

        const stats = globalDashboard.stats;
        
        const drawStatCard = (title: string, value: number, color: string, x: number, y: number, width: number, height: number) => {
            builder.doc.setDrawColor(settings.pdfTheme.borderColor);
            builder.doc.setFillColor('#FFFFFF');
            builder.doc.roundedRect(x, y, width, height, 5, 5, 'FD');
            
            builder.doc.setFontSize(settings.fontSizeLarge + 2);
            builder.doc.setFont(currentFontName, 'bold');
            builder.doc.setTextColor(settings.pdfTheme.textColor);
            builder.drawText(String(value), x + width / 2, y + 28, { align: 'center' });
            
            builder.doc.setFontSize(settings.fontSizeSmall - 1);
            builder.doc.setFont(currentFontName, 'normal');
            builder.doc.setTextColor(color);
            builder.drawText(title, x + width / 2, y + height - 10, { align: 'center' });
        };
        
        const cardWidth = (builder.pageWidth - builder.margin * 2 - 30) / 4;
        const cardHeight = 50;
        let cardX = builder.margin;
        let cardY = builder.yPos;
        
        const statCards = [
            { title: 'סה"כ בניינים', value: stats.totalProjects, color: '#64748b' },
            { title: 'בניינים פעילים', value: stats.activeProjects, color: '#3b82f6' },
            { title: 'סה"כ תקלות פתוחות', value: stats.totalOpenIssues, color: '#f59e0b' },
            { title: 'תקלות קריטיות פתוחות', value: stats.openCriticalIssues, color: '#ef4444' },
            { title: 'קבצים שפג תוקפם', value: stats.expiredFiles, color: '#f97316' },
            { title: 'משימות שפג תוקפן', value: stats.expiredTodos, color: '#f97316' },
            { title: 'קבצים לקראת תפוגה', value: stats.dueSoonFiles, color: '#8b5cf6' },
            { title: 'משימות לקראת תפוגה', value: stats.dueSoonTodos, color: '#8b5cf6' },
        ];

        statCards.forEach((card, index) => {
            if (index > 0 && index % 4 === 0) {
                cardX = builder.margin;
                cardY += cardHeight + 10;
            }
            drawStatCard(card.title, card.value, card.color, cardX, cardY, cardWidth, cardHeight);
            cardX += cardWidth + 10;
        });
        
        builder.yPos = cardY + cardHeight * 2 + 30;
        
        builder.checkPageBreak(220);
        
        const chartWidth = (builder.pageWidth - builder.margin * 2 - 20) / 2;
        const addChart = (title: string, imageUrl: string, x: number) => {
            const imgProps = builder.doc.getImageProperties(imageUrl);
            const imgHeight = (imgProps.height * chartWidth) / imgProps.width;
            
            builder.doc.setFontSize(settings.fontSizeMedium);
            builder.doc.setFont(currentFontName, 'bold');
            builder.doc.setTextColor(settings.pdfTheme.textColor);
            builder.drawText(title, x + chartWidth / 2, builder.yPos, { align: 'center' });
            
            builder.doc.addImage(imageUrl, 'PNG', x, builder.yPos + 20, chartWidth, imgHeight);

            return imgHeight + 20;
        };
        
        const chartHeight1 = addChart('בניינים לפי סטטוס', globalDashboard.statusChartImage, builder.margin);
        const chartHeight2 = Object.keys(stats.criticalIssuesByProject).length > 0
            ? addChart('תקלות קריטיות לפי בניין (Top 5)', globalDashboard.issuesChartImage, builder.margin + chartWidth + 20)
            : 0;

        builder.yPos += Math.max(chartHeight1, chartHeight2) + 20;
    }

    // Report-specific Dashboard
    if (reportDashboardImageUrl && settings.pdfIncludeDashboard) {
        builder.addPage();
        builder.drawHeading('סיכום ממצאים (דוח נוכחי)');
        const imgProps = builder.doc.getImageProperties(reportDashboardImageUrl);
        const imgWidth = (builder.pageWidth - builder.margin * 2) * 0.8; // 80% of available width
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        const x = (builder.pageWidth - imgWidth) / 2; // Centered
        builder.checkPageBreak(imgHeight);
        builder.doc.addImage(reportDashboardImageUrl, 'PNG', x, builder.yPos, imgWidth, imgHeight);
        builder.yPos += imgHeight + 20;
    }

    // Problems
    if (problems.length > 0) {
        builder.addPage();
        builder.drawHeading('פירוט תקלות');
    
        const availableWidth = builder.pageWidth - builder.margin * 2;
        const columnStyles = {
            0: { cellWidth: availableWidth * 0.25 }, // Notes
            1: { cellWidth: availableWidth * 0.20 }, // Location
            2: { cellWidth: availableWidth * 0.15 }, // Severity
            3: { cellWidth: availableWidth * 0.35 }, // Description
            4: { cellWidth: availableWidth * 0.05 }, // No.
        };
        const fontSize = builder.settings.fontSizeMedium;
    
        for (const [index, problem] of problems.entries()) {
            let totalBlockHeight = 0;
            const textPadding = 5 * 2; 

            const descriptionLines = builder.doc.splitTextToSize(processBidiText(problem.description), columnStyles[3].cellWidth - textPadding);
            const severityLines = builder.doc.splitTextToSize(processBidiText(problem.severity), columnStyles[2].cellWidth - textPadding);
            const locationLines = builder.doc.splitTextToSize(processBidiText(problem.locationTag || ''), columnStyles[1].cellWidth - textPadding);
            const notesLines = builder.doc.splitTextToSize(processBidiText(problem.notes || ''), columnStyles[0].cellWidth - textPadding);
            
            const maxLines = Math.max(descriptionLines.length, severityLines.length, locationLines.length, notesLines.length, 1);
            const textRowHeight = (maxLines * fontSize * 1.15) + textPadding;
            const headerHeight = (1 * fontSize * 1.15) + textPadding;
            totalBlockHeight += textRowHeight + headerHeight;

            const associatedWorkers = project.workers?.filter(w => problem.workerIds?.includes(w.id));
            const associatedSuppliers = allSuppliers.filter(s => problem.supplierIds?.includes(s.id));
            const associatedTenants = project.tenants?.filter(t => problem.tenantIds?.includes(t.id));
            const hasAssociated = (associatedWorkers?.length || 0) > 0 || (associatedSuppliers?.length || 0) > 0 || (associatedTenants?.length || 0) > 0;

            if (hasAssociated) {
                totalBlockHeight += 60; // Approximate height for the associated table
            }
    
            const photos = problem.images || [];
            if (photos.length > 0 && settings.pdfIncludeProblemPhotos) {
                const imagesPerRow = 3;
                const padding = 10;
                const boxSize = (availableWidth - (padding * (imagesPerRow - 1))) / imagesPerRow;
                const numRows = Math.ceil(photos.length / imagesPerRow);
                totalBlockHeight += numRows * (boxSize + 10);
            }
    
            builder.checkPageBreak(totalBlockHeight);
    
            autoTable(builder.doc, {
                startY: builder.yPos,
                head: [['הערות', 'מיקום', 'חומרה', 'תיאור', 'מס']],
                body: [[problem.notes, problem.locationTag || '', problem.severity, problem.description, (index + 1).toString()]],
                theme: 'grid',
                styles: { font: currentFontName, cellPadding: 5, textColor: settings.pdfTheme.textColor, fontSize: fontSize, halign: 'right' },
                headStyles: { fillColor: settings.pdfTheme.formGroupHeaderColor, textColor: settings.pdfTheme.textColor, fontStyle: 'bold' },
                margin: { top: 100 },
                willDrawCell: (data: any) => {
                    if (data.section === 'body' && data.column.index === 2) { // Severity column
                        const severity = data.cell.raw as "נמוכה" | "בינונית" | "גבוהה" | "קריטית";
                        const colors = SEVERITY_COLORS[severity];
                        if (colors) {
                            builder.doc.setFillColor(colors.pdfFill);
                            builder.doc.setTextColor(colors.pdfText);
                            builder.doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                        }
                    }
                },
                didParseCell: (data) => {
                    const textLines = Array.isArray(data.cell.text) ? data.cell.text : [String(data.cell.text)];
                    data.cell.text = textLines.map(t => processBidiText(t));
                },
                columnStyles: columnStyles,
            });
            builder.yPos = (builder.doc as any).lastAutoTable.finalY;

            if (hasAssociated) {
                builder.yPos += 15;
            
                builder.doc.setFont(currentFontName, 'bold');
                builder.doc.setFontSize(fontSize - 1);
                builder.drawText('גורמים משויכים', builder.pageWidth - builder.margin, builder.yPos, { align: 'right' });
                builder.doc.setFont(currentFontName, 'normal');
                builder.yPos += (fontSize - 1) * 1.15 + 5;

                const body: string[][] = [];
                if (associatedWorkers) body.push(...associatedWorkers.map(w => [w.name, 'עובד תחזוקה']));
                if (associatedSuppliers) body.push(...associatedSuppliers.map(s => [s.name, 'ספק']));
                if (associatedTenants) body.push(...associatedTenants.map(t => [t.name, 'דייר']));
            
                autoTable(builder.doc, {
                    startY: builder.yPos,
                    head: [['שם', 'סוג']],
                    body: body,
                    theme: 'grid',
                    styles: { fontSize: fontSize - 2, cellPadding: 3, font: currentFontName },
                    headStyles: { fillColor: '#e2e8f0', textColor: '#334155', fontStyle: 'bold', halign: 'right' },
                    bodyStyles: { halign: 'right' },
                    margin: { top: 100 },
                    didParseCell: (data) => { 
                        const text = Array.isArray(data.cell.text) ? data.cell.text : [String(data.cell.text)];
                        data.cell.text = text.map((t: string) => processBidiText(t));
                    }
                });
                builder.yPos = (builder.doc as any).lastAutoTable.finalY;
            }
    
            if (photos.length > 0 && settings.pdfIncludeProblemPhotos) {
                builder.drawPhotoGrid(photos, `תקלה: ${problem.description}`, { showHeader: false });
            }

            builder.yPos += 15;
        }
    }

    builder.finalize(report.title, report.title);
    return { failedImages: failedUrls };
};

export const generateSingleFormPdf = async (options: FormPdfGenerationOptions): Promise<{ failedImages: string[] }> => {
    const { settings, project, formWithTemplate } = options;

    const imageUrls = [
        settings.companyInfo.url || settings.companyInfo.logo,
        project.images[0]?.url || project.images[0]?.dataUrl,
        ...formWithTemplate.form.answers.flatMap(a => a.photos?.map(p => p.url || p.dataUrl) || []),
        formWithTemplate.form.reporterSignature?.url,
        formWithTemplate.form.reporterSignature?.dataUrl,
        formWithTemplate.form.managerSignature?.url,
        formWithTemplate.form.managerSignature?.dataUrl
    ].filter(Boolean) as string[];

    const { imageCache, failedUrls } = await preloadImages(imageUrls);
    const builder = new PdfBuilder(settings, imageCache);
    await builder.initializeFont();

    builder.drawProjectDetailsPage(project);
    builder.addPage();
    builder.drawForm(formWithTemplate);

    builder.finalize(formWithTemplate.template.name, formWithTemplate.template.name);
    return { failedImages: failedUrls };
};

export const generateFormsListPdf = async ({ settings, forms }: { settings: AppSettings, forms: FormWithContext[] }) => {
    const builder = await createPdfBuilderWithLogo(settings);
    builder.yPos = 100;
    
    const head = [['תאריך יצירה', 'קבוצת דוח', 'בניין', 'שם הטופס']];
    const body = forms.map(f => [
        formatDateTime(f.createdAt),
        f.reportGroup || '-',
        f.projectName,
        f.formTemplateName
    ]);

    builder.drawTable(head, body);
    builder.finalize('רשימת טפסים', 'forms_list');
};

export const generateChecklistPdf = async (options: ChecklistPdfGenerationOptions) => {
    const { settings, project, pendingProblems, fixedProblems } = options;
    
    let imageUrls: (string | undefined)[] = [settings.companyInfo.url || settings.companyInfo.logo];
    if (project) {
        imageUrls.push(project.images[0]?.url || project.images[0]?.dataUrl);
    }
    imageUrls = imageUrls.filter(Boolean);

    const { imageCache } = await preloadImages(imageUrls as string[]);
    const builder = new PdfBuilder(settings, imageCache);
    await builder.initializeFont();

    const title = project ? `רשימת תקלות: ${project.name}` : 'רשימת תקלות כללית';
    const fileName = project ? `checklist_${project.name}` : 'all_problems_checklist';

    if (project) {
        builder.drawProjectDetailsPage(project);
        builder.addPage();
    } else {
        builder.yPos = 100; // Start below header if no project page
    }
    
    if (pendingProblems && pendingProblems.length > 0) {
        builder.drawHeading('תקלות לטיפול');
        const body = project 
            ? pendingProblems.map(p => [p.severity, p.reportTitle, p.description])
            : pendingProblems.map(p => [p.projectName, p.severity, p.reportTitle, p.description]);
        const head = project 
            ? [['חומרה', 'דוח', 'תיאור']]
            : [['בניין', 'חומרה', 'דוח', 'תיאור']];
        builder.drawTable(head, body);
    }
    if (fixedProblems && fixedProblems.length > 0) {
        builder.checkPageBreak(80);
        builder.drawHeading('תקלות שטופלו');
        const body = project 
            ? fixedProblems.map(p => [p.severity, p.reportTitle, p.description])
            : fixedProblems.map(p => [p.projectName, p.severity, p.reportTitle, p.description]);
        const head = project 
            ? [['חומרה', 'דוח', 'תיאור']]
            : [['בניין', 'חומרה', 'דוח', 'תיאור']];
        builder.drawTable(head, body);
    }
    
    builder.finalize(title, fileName);
};

export const generateInventoryPdf = async ({ settings, projects }: InventoryPdfOptions) => {
    const builder = await createPdfBuilderWithLogo(settings);
    builder.yPos = 100;
    for (const project of projects) {
        builder.checkPageBreak(40);
        builder.drawHeading(project.name);
        for (const location of project.inventory || []) {
            for (const group of location.itemGroups) {
                builder.checkPageBreak(60);
                const title = `${location.name} > ${group.name}`;
                builder.drawText(title, builder.pageWidth - builder.margin, builder.yPos, { align: 'right' });
                builder.yPos += 20;
                builder.drawTable([['כמות', 'דגם', 'חברה', 'שם פריט']], group.items.map(item => [item.quantity, item.model, item.company, item.name]));
            }
        }
    }
    builder.finalize('דוח מלאי', 'inventory_report');
};

export const generateTenantsPdf = async ({ settings, project, tenants }: { settings: AppSettings; project: Project; tenants: Tenant[] }) => {
    const imageUrls = [
        settings.companyInfo.url || settings.companyInfo.logo,
        project.images[0]?.url || project.images[0]?.dataUrl,
    ].filter(Boolean) as string[];
    const { imageCache } = await preloadImages(imageUrls);
    const builder = new PdfBuilder(settings, imageCache);
    await builder.initializeFont();
    builder.drawProjectDetailsPage(project);
    builder.addPage();
    const head = [['ח.פ', 'שטח', 'משרד', 'קומה', 'אגף', 'מייל', 'טלפון', 'שם']];
    const body = tenants.map(t => [t.companyId || '-', t.officeSpace, t.officeNumber, t.floor, t.building, t.email, t.phone, t.name]);
    builder.drawTable(head, body);
    builder.finalize(`דוח דיירים: ${project.name}`, `tenants_${project.name}`);
};

export const generateAllTenantsPdf = async ({ settings, tenants }: { settings: AppSettings, tenants: TenantWithContext[] }) => {
    const builder = await createPdfBuilderWithLogo(settings);
    builder.yPos = 100;

    const tenantsByBuilding = tenants.reduce((acc, tenant) => {
        const buildingName = tenant.projectName;
        if (!acc[buildingName]) {
            acc[buildingName] = [];
        }
        acc[buildingName].push(tenant);
        return acc;
    }, {} as Record<string, TenantWithContext[]>);

    const sortedBuildingNames = Object.keys(tenantsByBuilding).sort((a, b) => a.localeCompare(b, 'he'));

    const parseFloor = (floorStr: string): number => {
        if (!floorStr) return Infinity;
        const lowerFloor = floorStr.toLowerCase().trim();
        
        if (lowerFloor.includes('קרקע')) return 0;
        if (lowerFloor.includes('מרתף')) {
            const match = lowerFloor.match(/-?\d+/);
            return match ? -Math.abs(parseInt(match[0], 10)) : -1;
        }
        
        const match = lowerFloor.match(/-?\d+/);
        return match ? parseInt(match[0], 10) : Infinity;
    };

    for (const buildingName of sortedBuildingNames) {
        builder.checkPageBreak(80);
        builder.drawHeading(buildingName);

        const tenantsInBuilding = tenantsByBuilding[buildingName];
        
        tenantsInBuilding.sort((a, b) => {
            const floorA = parseFloor(a.floor);
            const floorB = parseFloor(b.floor);
            if (floorA !== floorB) {
                return floorA - floorB;
            }
            return a.officeNumber.localeCompare(b.officeNumber, 'he', { numeric: true });
        });

        const head = [['ח.פ', 'שטח', 'משרד', 'קומה', 'מייל', 'טלפון', 'שם']];
        const body = tenantsInBuilding.map(t => [
            t.companyId || '-',
            t.officeSpace,
            t.officeNumber,
            t.floor,
            t.email,
            t.phone,
            t.name
        ]);

        builder.drawTable(head, body);
        builder.yPos += 20;
    }

    builder.finalize('דוח דיירים כללי', 'all_tenants');
};

export const generateSuppliersPdf = async ({ settings, suppliers }: { settings: AppSettings, suppliers: Supplier[] }) => {
    const builder = await createPdfBuilderWithLogo(settings);
    builder.yPos = 100;
    builder.drawTable([['ח.פ', 'מייל', 'טלפון', 'שם', 'תחום']], suppliers.map(s => [s.companyId || '', s.email, s.phone, s.name, s.group]));
    builder.finalize('רשימת ספקים', 'suppliers_list');
};

export const generateQuotationsPdf = async ({ settings, quotationsByBuilding }: { settings: AppSettings, quotationsByBuilding: Record<string, { groups: Record<string, Quotation[]>, total: number }> }) => {
    const builder = await createPdfBuilderWithLogo(settings);
    builder.yPos = 100;
    let grandTotal = 0;

    const head = [['שולמה', 'בוצעה', 'מחיר', 'מס\' חשבונית', 'מס\' הצעה', 'שם הצעה', 'ספק']];

    for (const [buildingName, data] of Object.entries(quotationsByBuilding)) {
        builder.checkPageBreak(60);
        builder.drawHeading(buildingName);
        let buildingTotal = 0;

        for (const [groupName, quotations] of Object.entries(data.groups)) {
            builder.checkPageBreak(80);
            builder.doc.setFontSize(settings.fontSizeMedium);
            builder.doc.setFont(currentFontName, 'bold');
            builder.drawText(groupName, builder.pageWidth - builder.margin, builder.yPos, { align: 'right' });
            builder.yPos += 25;
            builder.doc.setFont(currentFontName, 'normal');

            const groupTotal = quotations.reduce((sum, q) => sum + (q.price || 0), 0);
            buildingTotal += groupTotal;

            const body = quotations.map(q => {
                const isPaid = q.status === QuotationStatus.INVOICE_PAID;
                const isCompleted = isPaid || q.status === QuotationStatus.WORK_COMPLETED;
                return [
                    isPaid ? 'כן' : 'לא',
                    isCompleted ? 'כן' : 'לא',
                    q.price, // Pass raw number
                    q.invoiceNumber || '-',
                    q.quotationNumber,
                    q.quotationName,
                    q.supplierName,
                ];
            });

            const foot = [[
                '', '',
                {
                    content: groupTotal, // Pass raw number
                    styles: { fontStyle: 'bold' }
                },
                {
                    content: `סה"כ ${groupName}`,
                    colSpan: 4,
                    styles: { fontStyle: 'bold', halign: 'right' }
                }
            ]];

            builder.drawTable(head, body, {
                foot: foot,
                footStyles: { fillColor: settings.pdfTheme.formGroupHeaderColor },
                didParseCell: (data: any) => {
                    if (typeof data.cell.raw === 'number') {
                        const formattedNumber = `₪ ${Math.round(data.cell.raw).toLocaleString('he-IL')}`;
                        data.cell.styles.halign = 'left';
                        data.cell.text = [formattedNumber];
                    } else {
                        data.cell.text = [processBidiText(String(data.cell.raw))];
                    }
                },
                columnStyles: {
                    2: { halign: 'left' }
                }
            });
            builder.yPos += 10;
        }

        builder.checkPageBreak(40);
        builder.doc.setFontSize(settings.fontSizeMedium + 2);
        builder.doc.setFont(currentFontName, 'bold');
        builder.doc.setFillColor('#e0f2fe');
        builder.doc.setTextColor('#0c4a6e');
        builder.doc.rect(builder.margin, builder.yPos, builder.pageWidth - builder.margin * 2, 30, 'F');
        
        const buildingTotalText = `סה"כ לבניין ${buildingName}:`;
        const buildingTotalValue = `₪ ${Math.round(buildingTotal).toLocaleString('he-IL')}`;
        
        builder.drawText(buildingTotalValue, builder.margin + 10, builder.yPos + 20, { align: 'left', noBidi: true });
        builder.drawText(buildingTotalText, builder.pageWidth - builder.margin - 10, builder.yPos + 20, { align: 'right' });

        builder.yPos += 50;
        
        grandTotal += buildingTotal;
    }

    if (Object.keys(quotationsByBuilding).length > 1) {
        builder.checkPageBreak(40);
        builder.doc.setFontSize(settings.fontSizeLarge);
        builder.doc.setFont(currentFontName, 'bold');
        builder.doc.setFillColor(settings.pdfTheme.headerColor);
        builder.doc.setTextColor(settings.pdfTheme.headerTextColor);
        builder.doc.rect(builder.margin, builder.yPos, builder.pageWidth - builder.margin * 2, 35, 'F');
        
        const grandTotalText = `סה"כ כללי:`;
        const grandTotalValue = `₪ ${Math.round(grandTotal).toLocaleString('he-IL')}`;
        
        builder.drawText(grandTotalValue, builder.margin + 10, builder.yPos + 24, { align: 'left', noBidi: true });
        builder.drawText(grandTotalText, builder.pageWidth - builder.margin - 10, builder.yPos + 24, { align: 'right' });
        
        builder.yPos += 55;
    }

    builder.finalize('דוח הצעות מחיר', 'quotations_report');
};

export const getAllProblemsChecklistPdf = async ({ settings, problems }: { settings: AppSettings, problems: ProblemWithContext[] }) => {
    const builder = await createPdfBuilderWithLogo(settings);
    builder.yPos = 100;

    const problemsByBuilding = problems.reduce((acc, problem) => {
        const buildingName = problem.projectName;
        if (!acc[buildingName]) {
            acc[buildingName] = [];
        }
        acc[buildingName].push(problem);
        return acc;
    }, {} as Record<string, ProblemWithContext[]>);

    const sortedBuildingNames = Object.keys(problemsByBuilding).sort((a, b) => a.localeCompare(b, 'he'));

    const head = [['תאריך דוח', 'מיקום', 'חומרה', 'דוח', 'תיאור']];
    
    for (const buildingName of sortedBuildingNames) {
        builder.checkPageBreak(80);
        builder.drawHeading(buildingName);

        const problemsInBuilding = problemsByBuilding[buildingName];
        
        const body = problemsInBuilding.map(p => [
            formatDate(p.reportDate),
            p.locationTag || '-',
            p.severity,
            p.reportTitle,
            p.description
        ]);

        builder.drawTable(head, body, {
            willDrawCell: (data: any) => {
                if (data.section === 'body' && data.column.index === 2) { // Severity column
                    const severity = data.cell.raw as "נמוכה" | "בינונית" | "גבוהה" | "קריטית";
                    const colors = SEVERITY_COLORS[severity];
                    if (colors) {
                        builder.doc.setFillColor(colors.pdfFill);
                        builder.doc.setTextColor(colors.pdfText);
                        builder.doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                    }
                }
            },
        });
        builder.yPos += 20;
    }

    builder.finalize('רשימת תקלות כללית', 'all_problems_checklist');
};


export const generateAllFilesPdf = async ({ settings, files }: { settings: AppSettings, files: FileWithContext[] }) => {
    const builder = await createPdfBuilderWithLogo(settings);
    builder.yPos = 100;
    builder.drawHeading('רשימת כל הקבצים');

    const filesByBuilding = files.reduce((acc, file) => {
        if (!acc[file.projectName]) acc[file.projectName] = [];
        acc[file.projectName].push(file);
        return acc;
    }, {} as Record<string, FileWithContext[]>);

    for (const buildingName of Object.keys(filesByBuilding).sort()) {
        builder.checkPageBreak(60);
        builder.drawHeading(buildingName);
        const head = [['סטטוס', 'תאריך תפוגה', 'קבוצה', 'שם קובץ']];
        const body = filesByBuilding[buildingName].map(f => [
            getSimpleFileStatusForPdf(f.dueDate),
            f.dueDate ? formatDate(f.dueDate) : '-',
            f.group || '-',
            f.name
        ]);
        builder.drawTable(head, body);
    }
    builder.finalize('רשימת כל הקבצים', 'all_files_list');
};

export const generateAllTodosPdf = async ({ settings, todos }: { settings: AppSettings, todos: TodoWithContext[] }) => {
    const builder = await createPdfBuilderWithLogo(settings);
    builder.yPos = 100;
    builder.drawHeading('רשימת כל המשימות');

    const todosByBuilding = todos.reduce((acc, todo) => {
        if (!acc[todo.projectName]) acc[todo.projectName] = [];
        acc[todo.projectName].push(todo);
        return acc;
    }, {} as Record<string, TodoWithContext[]>);

    for (const buildingName of Object.keys(todosByBuilding).sort()) {
        builder.checkPageBreak(60);
        builder.drawHeading(buildingName);
        const head = [['סטטוס', 'תאריך יעד', 'קבוצה', 'תיאור']];
        const body = todosByBuilding[buildingName].map(t => [
            t.isCompleted ? 'הושלם' : getSimpleFileStatusForPdf(t.dueDate),
            t.dueDate ? formatDate(t.dueDate) : '-',
            t.group || '-',
            t.description
        ]);
        builder.drawTable(head, body);
    }
    builder.finalize('רשימת כל המשימות', 'all_todos_list');
};

export const generateProjectFilesPdf = async ({ settings, project, files }: { settings: AppSettings, project: Project, files: ProjectFile[] }) => {
    const imageUrls = [
        settings.companyInfo.url || settings.companyInfo.logo,
        project.images[0]?.url || project.images[0]?.dataUrl,
    ].filter(Boolean) as string[];
    const { imageCache } = await preloadImages(imageUrls);
    const builder = new PdfBuilder(settings, imageCache);
    await builder.initializeFont();
    builder.drawProjectDetailsPage(project);
    builder.addPage();
    builder.drawHeading('רשימת קבצים');

    const head = [['סטטוס', 'תאריך תפוגה', 'קבוצה', 'שם קובץ']];
    const body = files.map(f => [
        getSimpleFileStatusForPdf(f.dueDate),
        f.dueDate ? formatDate(f.dueDate) : '-',
        f.group || '-',
        f.name
    ]);

    builder.drawTable(head, body);
    builder.finalize(`רשימת קבצים - ${project.name}`, `files_${project.name}`);
};

export const generateProjectTodosPdf = async ({ settings, project, todos }: { settings: AppSettings, project: Project, todos: ProjectTodo[] }) => {
    const imageUrls = [
        settings.companyInfo.url || settings.companyInfo.logo,
        project.images[0]?.url || project.images[0]?.dataUrl,
    ].filter(Boolean) as string[];
    const { imageCache } = await preloadImages(imageUrls);
    const builder = new PdfBuilder(settings, imageCache);
    await builder.initializeFont();
    builder.drawProjectDetailsPage(project);
    builder.addPage();
    builder.drawHeading('רשימת משימות');
    
    const head = [['סטטוס', 'תאריך יעד', 'קבוצה', 'תיאור']];
    const body = todos.map(t => [
        t.isCompleted ? 'הושלם' : getSimpleFileStatusForPdf(t.dueDate),
        t.dueDate ? formatDate(t.dueDate) : '-',
        t.group || '-',
        t.description
    ]);

    builder.drawTable(head, body);
    builder.finalize(`רשימת משימות - ${project.name}`, `todos_${project.name}`);
};

export const generateAllInventoryPdf = async ({ settings, items }: { settings: AppSettings, items: InventoryItemWithContext[] }) => {
    const builder = await createPdfBuilderWithLogo(settings);
    builder.yPos = 100;
    builder.drawHeading('דוח מלאי כללי');

    const itemsByBuilding = items.reduce((acc, item) => {
        if (!acc[item.buildingName]) acc[item.buildingName] = [];
        acc[item.buildingName].push(item);
        return acc;
    }, {} as Record<string, InventoryItemWithContext[]>);

    for (const buildingName of Object.keys(itemsByBuilding).sort()) {
        builder.checkPageBreak(60);
        builder.drawHeading(buildingName);
        const head = [['כמות', 'דגם', 'חברה', 'קבוצה', 'מיקום', 'שם פריט']];
        const body = itemsByBuilding[buildingName].map(i => [i.quantity, i.model, i.company, i.groupName, i.locationName, i.name]);
        builder.drawTable(head, body);
    }
    builder.finalize('דוח מלאי כללי', 'all_inventory_report');
};

export const generateBuildingInventoryPdf = async ({ settings, project, items }: { settings: AppSettings, project: Project, items: InventoryItemWithContext[] }) => {
    const imageUrls = [
        settings.companyInfo.url || settings.companyInfo.logo,
        project.images[0]?.url || project.images[0]?.dataUrl,
    ].filter(Boolean) as string[];
    const { imageCache } = await preloadImages(imageUrls);
    const builder = new PdfBuilder(settings, imageCache);
    await builder.initializeFont();
    builder.drawProjectDetailsPage(project);
    builder.addPage();
    builder.drawHeading('דוח מלאי');

    const itemsByLocation = items.reduce((acc, item) => {
        const key = `${item.locationName} > ${item.groupName}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {} as Record<string, InventoryItemWithContext[]>);

    for (const group of Object.keys(itemsByLocation).sort()) {
        builder.checkPageBreak(60);
        builder.drawText(group, builder.pageWidth - builder.margin, builder.yPos, { align: 'right' });
        builder.yPos += 20;
        const head = [['כמות', 'דגם', 'חברה', 'שם פריט']];
        const body = itemsByLocation[group].map(i => [i.quantity, i.model, i.company, i.name]);
        builder.drawTable(head, body);
    }
    builder.finalize(`דוח מלאי - ${project.name}`, `inventory_${project.name}`);
};

export const generateAllWorkersPdf = async ({ settings, workers }: { settings: AppSettings, workers: WorkerWithContext[] }) => {
    const { imageCache } = await preloadImages(workers.map(w => w.photo?.url || w.photo?.dataUrl));
    const builder = new PdfBuilder(settings, imageCache);
    await builder.initializeFont();

    const workersByBuilding = workers.reduce((acc, worker) => {
        if (!acc[worker.projectName]) acc[worker.projectName] = [];
        acc[worker.projectName].push(worker);
        return acc;
    }, {} as Record<string, WorkerWithContext[]>);

    builder.yPos = 100;
    for (const buildingName of Object.keys(workersByBuilding).sort()) {
        builder.checkPageBreak(80);
        builder.drawHeading(buildingName);
        for (const worker of workersByBuilding[buildingName]) {
            builder.drawWorkerDetails(worker);
        }
    }
    builder.finalize('רשימת עובדים כללית', 'all_workers_list');
};

export const generateProjectWorkersPdf = async ({ settings, project, workers }: { settings: AppSettings, project: Project, workers: Worker[] }) => {
    const imageUrls = [
        settings.companyInfo.url || settings.companyInfo.logo,
        project.images[0]?.url || project.images[0]?.dataUrl,
        ...workers.map(w => w.photo?.url || w.photo?.dataUrl)
    ].filter(Boolean) as string[];
    const { imageCache } = await preloadImages(imageUrls);
    const builder = new PdfBuilder(settings, imageCache);
    await builder.initializeFont();
    builder.drawProjectDetailsPage(project);
    builder.addPage();
    builder.drawHeading('רשימת עובדים');
    for (const worker of workers) {
        builder.drawWorkerDetails(worker);
    }
    builder.finalize(`רשימת עובדים - ${project.name}`, `workers_${project.name}`);
};

export const generateProjectNotesPdf = async ({ settings, project, notes }: NotesPdfGenerationOptions) => {
    const imageUrls = [
        settings.companyInfo.url || settings.companyInfo.logo,
        project.images[0]?.url || project.images[0]?.dataUrl,
    ].filter(Boolean) as string[];
    const { imageCache } = await preloadImages(imageUrls);
    const builder = new PdfBuilder(settings, imageCache);
    await builder.initializeFont();
    builder.drawProjectDetailsPage(project);
    builder.addPage();
    builder.drawHeading('הערות ומידע');
    
    const head = [['נכתב על ידי', 'תאריך', 'תוכן']];
    const body = notes.map(n => [n.author, formatDateTime(n.createdAt), n.content]);
    
    builder.drawTable(head, body);
    builder.finalize(`הערות - ${project.name}`, `notes_${project.name}`);
};

export const generateElectricalToolsPdf = async ({ settings, project, items }: ElectricalToolsPdfOptions) => {
    const imageUrls = [
        settings.companyInfo.url || settings.companyInfo.logo,
        project.images[0]?.url || project.images[0]?.dataUrl,
    ].filter(Boolean) as string[];
    const { imageCache } = await preloadImages(imageUrls);
    const builder = new PdfBuilder(settings, imageCache);
    await builder.initializeFont();
    builder.drawProjectDetailsPage(project);
    builder.addPage();
    builder.drawHeading('בדיקת כלי עבודה חשמליים');
    
    const head = [['סטטוס', 'נבדק לאחרונה', 'דגם', 'חברה', 'שם הכלי']];
    const body = items.map(i => [
        i.checkStatus || 'לא נבדק',
        i.lastCheckedDate ? formatDate(i.lastCheckedDate) : '-',
        i.model,
        i.company,
        i.name,
    ]);
    
    builder.drawTable(head, body);
    builder.finalize(`בדיקת כלים - ${project.name}`, `electrical_tools_${project.name}`);
};

export const generateOrderListPdf = async ({ settings, items }: OrderListPdfOptions) => {
    const builder = await createPdfBuilderWithLogo(settings);
    builder.yPos = 100;
    builder.drawHeading('רשימת פריטים להזמנה');
    
    const head = [['כמות', 'שם פריט']];
    const body = items.map(i => [i.quantity, i.name]);

    builder.drawTable(head, body);
    builder.finalize('רשימת הזמנות', 'order_list');
};

export const generateAllSubProjectsPdf = async ({ settings, subProjects }: AllSubProjectsPdfOptions) => {
    const builder = await createPdfBuilderWithLogo(settings);
    builder.yPos = 100;
    builder.drawHeading('רשימת כל פרויקטי המשנה');

    const head = [['סטטוס', 'תאריך התחלה', 'בניין', 'שם פרויקט']];
    const body = subProjects.map(sp => [
        sp.status,
        sp.workStartDate ? formatDate(sp.workStartDate) : '-',
        sp.projectName,
        sp.name
    ]);

    builder.drawTable(head, body);
    builder.finalize('כל פרויקטי המשנה', 'all_sub_projects');
};

export const generateSubProjectDetailPdf = async ({ settings, project, subProject, quotations }: SubProjectDetailPdfOptions) => {
    const imageUrls = [
        settings.companyInfo.url || settings.companyInfo.logo,
        project.images[0]?.url || project.images[0]?.dataUrl,
        subProject.coverPhoto?.url || subProject.coverPhoto?.dataUrl,
    ].filter(Boolean) as string[];

    const { imageCache } = await preloadImages(imageUrls);
    const builder = new PdfBuilder(settings, imageCache);
    await builder.initializeFont();

    builder.drawProjectDetailsPage(project);

    builder.addPage();
    builder.yPos = 100;

    const coverPhotoUrl = subProject.coverPhoto?.url || subProject.coverPhoto?.dataUrl;
    const imageElement = coverPhotoUrl ? imageCache.get(coverPhotoUrl) : null;
    
    let contentStartY = builder.yPos;
    let contentStartX = builder.margin;
    let contentWidth = builder.pageWidth - builder.margin * 2;
    let imageFinalY = builder.yPos;

    if (imageElement) {
        const imgWidth = (builder.pageWidth - builder.margin * 2) * 0.30; // 30% of content area
        const imgHeight = (imageElement.height * imgWidth) / imageElement.width;
        const imageX = builder.margin;
        const imageY = builder.yPos;

        builder.checkPageBreak(imgHeight + 20); // Check if image fits
        builder.doc.addImage(imageElement, 'JPEG', imageX, imageY, imgWidth, imgHeight);
        
        imageFinalY = imageY + imgHeight;

        // Content starts to the right of the image
        contentStartX = imageX + imgWidth + 20;
        contentWidth = builder.pageWidth - contentStartX - builder.margin;
    }

    // Manually draw heading and description in the available content area
    builder.doc.setFontSize(settings.fontSizeLarge);
    builder.doc.setFont(currentFontName, 'bold');
    builder.doc.setTextColor(settings.pdfTheme.textColor);
    
    const headingText = `פרטי פרויקט: ${subProject.name}`;
    builder.drawText(headingText, contentStartX + contentWidth, contentStartY, { align: 'right' });
    contentStartY += settings.fontSizeLarge * 1.15 + 10;
    
    builder.doc.setFontSize(settings.fontSizeMedium);
    builder.doc.setFont(currentFontName, 'normal');
    
    const descriptionLines = builder.doc.splitTextToSize(processBidiText(subProject.description), contentWidth);
    builder.drawText(subProject.description, contentStartX + contentWidth, contentStartY, { align: 'right', maxWidth: contentWidth });
    const descriptionHeight = descriptionLines.length * (settings.fontSizeMedium * 1.15);
    contentStartY += descriptionHeight + 20;
    
    // Set the main yPos to the greater of the image's bottom or the text's bottom
    builder.yPos = Math.max(imageFinalY, contentStartY) + 20;

    builder.drawHeading('הצעות מחיר');
    const head = [['מחיר', 'ספק', 'שם הצעה']];
    
    const body = quotations.map(q => [q.price, q.supplierName, q.quotationName]);

    builder.drawTable(head, body, {
        didParseCell: (data: any) => {
            if (typeof data.cell.raw === 'number') {
                const formattedNumber = `₪ ${Math.round(data.cell.raw).toLocaleString('he-IL')}`;
                data.cell.styles.halign = 'left';
                data.cell.text = [formattedNumber];
            } else {
                data.cell.text = [processBidiText(String(data.cell.raw))];
            }
        },
        columnStyles: {
            0: { halign: 'left' }
        }
    });
    
    builder.finalize(`פרויקט - ${subProject.name}`, `sub_project_${subProject.name}`);
};