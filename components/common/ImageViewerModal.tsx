import React from 'react';
import Modal from './Modal';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText: string;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ isOpen, onClose, imageUrl, altText }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={altText} size="xl">
      <div className="flex justify-center items-center bg-slate-100 rounded-lg p-2">
        <img src={imageUrl} alt={altText} className="max-w-full max-h-[80vh] object-contain rounded-md" />
      </div>
    </Modal>
  );
};

export default ImageViewerModal;