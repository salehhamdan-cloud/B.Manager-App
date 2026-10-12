

import * as XLSX from 'xlsx';

/**
 * Exports data to a genuine Excel (.xlsx) file with full UTF-8 support,
 * right-to-left (RTL) worksheet formatting, and auto-sized columns.
 * Hebrew and Arabic characters render flawlessly in Microsoft Excel, Google Sheets,
 * and Apple Numbers.
 */
export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'נתונים') => {
    if (!data || data.length === 0) {
        console.warn('No data provided to export to Excel.');
        return;
    }

    try {
        // Create a new worksheet from JSON data
        const worksheet = XLSX.utils.json_to_sheet(data);

        // Enable Right-to-Left (RTL) display for Hebrew spreadsheets in Excel
        worksheet['!views'] = [{ RTL: true }];

        // Calculate and apply optimal column widths based on headers and cell contents
        const headers = Object.keys(data[0]);
        const colWidths = headers.map(header => {
            let maxLen = header.length;
            for (let i = 0; i < Math.min(data.length, 100); i++) {
                const val = data[i][header];
                if (val !== null && val !== undefined) {
                    const strVal = String(val);
                    if (strVal.length > maxLen) {
                        maxLen = Math.min(strVal.length, 45);
                    }
                }
            }
            return { wch: Math.max(maxLen + 3, 12) };
        });
        worksheet['!cols'] = colWidths;

        // Create workbook and append worksheet
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // Clean filename (strip extension if already provided)
        const cleanFileName = fileName.replace(/\.(xlsx|xls|csv)$/i, '');

        // Trigger native browser download as .xlsx
        XLSX.writeFile(workbook, `${cleanFileName}.xlsx`, { bookType: 'xlsx', type: 'binary' });
    } catch (error) {
        console.error('Error generating Excel file, falling back to CSV:', error);
        exportToCsvRaw(data, fileName);
    }
};

/**
 * Universal export method: Exports native .xlsx with full Hebrew UTF-8 & RTL support.
 * Serves as drop-in replacement for exportToCsv across all application sections.
 */
export const exportToCsv = (data: any[], fileName: string) => {
    exportToExcel(data, fileName);
};

/**
 * Raw CSV export with UTF-8 BOM (\uFEFF)
 */
export const exportToCsvRaw = (data: any[], fileName: string) => {
    if (!data || data.length === 0) {
        console.warn("No data provided to export.");
        return;
    }

    const headers = Object.keys(data[0]);
    
    // Helper to safely quote a value for CSV
    const toCsvField = (value: any): string => {
        const str = String(value !== null && value !== undefined ? value : '');
        // Escape double quotes by doubling them
        const escaped = str.replace(/"/g, '""');
        return `"${escaped}"`;
    };

    const headerRow = headers.map(header => toCsvField(header)).join(',');

    const dataRows = data.map(row => 
        headers.map(fieldName => toCsvField(row[fieldName])).join(',')
    );
    
    const csvString = [headerRow, ...dataRows].join('\r\n');
    
    // The Byte Order Mark (BOM) for UTF-8 (\uFEFF) ensures Excel and spreadsheets
    // immediately recognize UTF-8 encoding and render Hebrew & Arabic characters cleanly.
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });

    const cleanFileName = fileName.replace(/\.(xlsx|xls|csv)$/i, '');
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${cleanFileName}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
};
