

export const exportToCsv = (data: any[], fileName: string) => {
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

    const headerRow = headers.map((header, index) => {
        // The Right-to-Left Mark (RLM) is an invisible character (\u200F).
        // Prepending it to the very first cell of a CSV file is a standard method
        // to signal to applications like Microsoft Excel that the file's layout
        // should be rendered from right to left, which is crucial for Hebrew and Arabic.
        const value = index === 0 ? `\u200F${header}` : header;
        return toCsvField(value);
    }).join(',');

    const dataRows = data.map(row => 
        headers.map(fieldName => toCsvField(row[fieldName])).join(',')
    );
    
    const csvString = [headerRow, ...dataRows].join('\n');
    
    // The Byte Order Mark (BOM) for UTF-8 (\uFEFF) is included to ensure that
    // applications correctly interpret special characters and Hebrew letters.
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${fileName}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};