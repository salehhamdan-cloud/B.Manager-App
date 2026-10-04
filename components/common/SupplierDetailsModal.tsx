import React from 'react';
import { Supplier } from '../../types';
import Modal from './Modal';

interface SupplierDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

const SupplierDetailsModal: React.FC<SupplierDetailsModalProps> = ({ isOpen, onClose, supplier }) => {
  if (!supplier) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`פרטי ספק: ${supplier.name}`}>
      <div className="space-y-4 text-slate-700">
        <div className="p-4 bg-slate-50 rounded-lg">
          <p><strong>שם:</strong> {supplier.name}</p>
          <p><strong>תחום:</strong> {supplier.group}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <p><strong>טלפון:</strong> <a href={`tel:${supplier.phone}`} className="text-sky-600 hover:underline">{supplier.phone}</a></p>
            <p><strong>אימייל:</strong> <a href={`mailto:${supplier.email}`} className="text-sky-600 hover:underline">{supplier.email}</a></p>
            <p><strong>ח.פ:</strong> {supplier.companyId || '-'}</p>
        </div>
      </div>
    </Modal>
  );
};

export default SupplierDetailsModal;
