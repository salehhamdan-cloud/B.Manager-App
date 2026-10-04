import React, { useState, ChangeEvent, useRef } from 'react';
import { optimizeImage } from '../../services/imageService';
import { useToast } from '../../contexts/ToastContext';
import { TrashIcon, PencilIcon, ShareIcon } from '../icons/ActionIcons';
import { AnnotatedImage } from '../../types';
import { generateId } from '../../utils/idGenerator';
import { IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT, IMAGE_QUALITY } from '../../constants';
import { AnnotationEditor } from './AnnotationEditor';
import { shareFile } from '../../utils/shareUtils';

interface ImageUploaderProps {
  images: AnnotatedImage[];
  onImagesChange: (images: AnnotatedImage[]) => void;
  maxImages?: number;
  allowNotes?: boolean;
  allowSharing?: boolean;
  shareContextText?: string;
  forceJpegCompression?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  onImagesChange,
  maxImages = 5,
  allowNotes = true,
  allowSharing = false,
  shareContextText = 'Check out this image',
  forceJpegCompression = true,
}) => {
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnnotationEditorOpen, setAnnotationEditorOpen] = useState(false);
  const [currentImageToAnnotate, setCurrentImageToAnnotate] = useState<AnnotatedImage | null>(null);
  const [annotationImageSrc, setAnnotationImageSrc] = useState('');

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);

    if (images.length + files.length > maxImages) {
      addToast(`ניתן להעלות עד ${maxImages} תמונות.`, 'warning');
      return;
    }

    const newImagesPromises = files.map((file: File) =>
      optimizeImage(file, IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT, IMAGE_QUALITY, forceJpegCompression)
        .then(optimized => ({
          id: generateId(),
          name: optimized.name,
          mimeType: optimized.mimeType,
          dataUrl: optimized.dataUrl, // For immediate display & upload
          originalDataUrl: optimized.dataUrl, // For re-editing locally
          annotationData: '[]', // Empty annotation array
          createdAt: new Date().toISOString(),
          caption: '',
        }))
        .catch(error => {
          console.error('Error optimizing image:', error);
          addToast(`שגיאה בעיבוד התמונה ${file.name}`, 'error');
          return null;
        })
    );

    const newAnnotatedImages = (await Promise.all(newImagesPromises)).filter(img => img !== null) as AnnotatedImage[];
    onImagesChange([...images, ...newAnnotatedImages]);
    if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
  };

  const handleRemoveImage = (id: string) => {
    onImagesChange(images.filter(img => img.id !== id));
  };
  
  const handleCaptionChange = (id: string, caption: string) => {
    onImagesChange(
        images.map(img => (img.id === id ? { ...img, caption } : img))
    );
  };

  const handleOpenAnnotationEditor = (image: AnnotatedImage) => {
    setCurrentImageToAnnotate(image);
    // Fallback chain: dedicated original URL > dedicated original data > current display URL > current display data.
    // This ensures that any image can be annotated, treating its current version as the original if a dedicated original doesn't exist.
    const src = image.originalUrl || image.originalDataUrl || image.url || image.dataUrl;
    if (!src) {
        addToast('שגיאה בטעינת התמונה לעריכה.', 'error');
        return;
    }
    setAnnotationImageSrc(src);
    setAnnotationEditorOpen(true);
  };
  
  const handleSaveAnnotation = (data: { annotatedDataUrl: string; annotationData: string; }) => {
    if (currentImageToAnnotate) {
        onImagesChange(
            images.map(img =>
                img.id === currentImageToAnnotate.id 
                ? { ...img, dataUrl: data.annotatedDataUrl, annotationData: data.annotationData } 
                : img
            )
        );
        addToast('הערות תמונה נשמרו', 'success');
    }
    setAnnotationEditorOpen(false);
    setCurrentImageToAnnotate(null);
  };

  const handleShareImage = async (image: AnnotatedImage) => {
    const imageUrlToShare = image.url || image.dataUrl;
    if (!imageUrlToShare) {
        addToast('לא נמצאה תמונה לשיתוף.', 'error');
        return;
    }
    try {
      await shareFile(imageUrlToShare, image.name, shareContextText);
    } catch (error: any) {
      addToast(error.message, 'error');
    }
  };


  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">תמונות (עד {maxImages})</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          ref={fileInputRef}
          className="block w-full text-sm text-slate-500 file:mr-4 file:rtl:ml-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 disabled:opacity-50"
          disabled={images.length >= maxImages}
        />
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map(image => (
            <div key={image.id} className="border border-slate-200 rounded-lg overflow-hidden shadow bg-white flex flex-col">
              <div className="relative group">
                <img
                  src={image.url || image.dataUrl}
                  alt={image.name}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex flex-col items-center justify-center p-1">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2 rtl:space-x-reverse">
                    {allowSharing && (
                      <button
                        type="button"
                        onClick={() => handleShareImage(image)}
                        className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                        title="שתף תמונה"
                      >
                        <ShareIcon className="w-4 h-4" />
                      </button>
                    )}
                    {allowNotes && (
                      <button
                        type="button"
                        onClick={() => handleOpenAnnotationEditor(image)}
                        className="p-1.5 bg-sky-500 text-white rounded-full hover:bg-sky-600"
                        title="ערוך הערות"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(image.id)}
                      className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                      title="מחק תמונה"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <input
                    type="text"
                    placeholder="הוסף כיתוב..."
                    value={image.caption || ''}
                    onChange={(e) => handleCaptionChange(image.id, e.target.value)}
                    className="w-full text-xs border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                    aria-label={`כיתוב לתמונה ${image.name}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {isAnnotationEditorOpen && currentImageToAnnotate && (
        <AnnotationEditor
            isOpen={isAnnotationEditorOpen}
            onClose={() => {
                setAnnotationEditorOpen(false);
                setCurrentImageToAnnotate(null);
                setAnnotationImageSrc('');
            }}
            onSave={handleSaveAnnotation}
            imageSrc={annotationImageSrc}
            initialAnnotationData={currentImageToAnnotate.annotationData || '[]'}
        />
      )}
    </div>
  );
};

export default ImageUploader;