
import { IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT, IMAGE_QUALITY } from '../constants';

export const optimizeImage = async (
    file: File, 
    maxWidth: number = IMAGE_MAX_WIDTH, 
    maxHeight: number = IMAGE_MAX_HEIGHT, 
    quality: number = IMAGE_QUALITY,
    forceJpeg: boolean = false
): Promise<{ dataUrl: string, name: string, mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('לא ניתן היה לקבל את הקשר הקנבס'));
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        const outputMimeType = forceJpeg ? 'image/jpeg' : (file.type === 'image/png' ? 'image/png' : 'image/jpeg');
        const dataUrl = canvas.toDataURL(outputMimeType, quality);
        resolve({ dataUrl, name: file.name, mimeType: outputMimeType });
      };
      img.onerror = (err) => reject(new Error('שגיאה בטעינת התמונה: ' + err));
      if (event.target?.result) {
        img.src = event.target.result as string;
      } else {
        reject(new Error('לא ניתן היה לקרוא את קובץ התמונה'));
      }
    };
    reader.onerror = (err) => reject(new Error('שגיאה בקריאת קובץ: ' + err));
    reader.readAsDataURL(file);
  });
};