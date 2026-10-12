import React from 'react';
import PhotoFileViewer from './PhotoFileViewer';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText: string;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ isOpen, onClose, imageUrl, altText }) => {
  return (
    <PhotoFileViewer
      isOpen={isOpen}
      onClose={onClose}
      fileUrl={imageUrl}
      fileName={altText}
      mimeType="image/jpeg"
    />
  );
};

export default ImageViewerModal;