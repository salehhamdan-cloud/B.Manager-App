/**
 * Converts a base64 data URL to a File object.
 * @param dataUrl The base64 data URL.
 * @param filename The desired filename for the File object.
 * @returns A Promise that resolves to a File object.
 */
export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
}

/**
 * Shares a file using the Web Share API.
 * @param dataUrl The base64 data URL or a public URL of the file to share.
 * @param name The name of the file.
 * @param text Optional text to share along with the file.
 */
export const shareFile = async (dataUrl: string, name: string, text?: string): Promise<void> => {
    if (!navigator.share) {
        throw new Error('שיתוף אינו נתמך בדפדפן זה.');
    }

    try {
        const file = await dataUrlToFile(dataUrl, name);
        const shareData: ShareData = {
            files: [file],
            title: name,
            text: text || `קובץ: ${name}`,
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            // Fallback for browsers that don't support canShare but have share
            await navigator.share(shareData);
        }
    } catch (error: any) {
        // Ignore AbortError which happens when the user closes the share dialog
        if (error.name !== 'AbortError') {
            console.error('Error sharing file:', error);
            throw new Error(`לא ניתן היה לשתף את הקובץ. סיבה: ${error.message}`);
        }
    }
};


/**
 * Shares multiple files using the Web Share API.
 * @param filesToShare An array of objects with dataUrl/url and name for each file.
 * @param text Optional text to share along with the files.
 */
export const shareFiles = async (filesToShare: { dataUrl: string; name: string }[], text?: string): Promise<void> => {
    if (!navigator.share) {
        throw new Error('שיתוף אינו נתמך בדפדפן זה.');
    }
    
    // Check if sharing files is supported at all
    // Create a dummy file for the check as per MDN recommendation
    const dummyFile = new File([""], "dummy.txt", { type: "text/plain" });
    if (!navigator.canShare || !navigator.canShare({ files: [dummyFile] })) {
         throw new Error('שיתוף קבצים אינו נתמך בדפדפן זה.');
    }

    try {
        const files: File[] = await Promise.all(
            filesToShare.map(f => dataUrlToFile(f.dataUrl, f.name))
        );

        const shareData: ShareData = {
            files: files,
            title: `קבצים משותפים (${files.length})`,
            text: text || 'מצורפים קבצים',
        };

        if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            throw new Error('לא ניתן לשתף את הקבצים שנבחרו (ייתכן שהם גדולים מדי או מסוג לא נתמך).');
        }
    } catch (error: any) {
        if (error.name !== 'AbortError') {
            console.error('Error sharing files:', error);
            throw new Error(`לא ניתן היה לשתף את הקבצים. סיבה: ${error.message}`);
        }
    }
};