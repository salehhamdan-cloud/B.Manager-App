import React from 'react';
import { WorkerWithContext, License, PermitFile } from '../../types';
import Modal from './Modal';
import { PhoneIcon, EnvelopeIcon, MapPinIcon } from '../icons/ContactIcons';
import { getFileValidityStatus } from '../../utils/dateFormatter';
import { ArrowDownTrayIcon } from '../icons/ActionIcons';

interface WorkerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: WorkerWithContext | null;
}

const getInitials = (name: string): string => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

const PermitRow: React.FC<{ permit: PermitFile; label: string; }> = ({ permit, label }) => {
    const status = getFileValidityStatus(permit.validUntil);
    return (
        <div className="flex justify-between items-center p-2 bg-slate-100 rounded-md">
            <div>
                <p className="font-medium">{label}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>{status.text}</span>
            </div>
            {permit.url && (
                <a href={permit.url} target="_blank" rel="noopener noreferrer" className="p-2 text-sky-600 hover:bg-sky-100 rounded-full" title={`הורד ${label}`}>
                    <ArrowDownTrayIcon className="w-5 h-5" />
                </a>
            )}
        </div>
    );
};

const LicenseRow: React.FC<{ license: License }> = ({ license }) => (
    <div className="flex justify-between items-center p-2 bg-slate-100 rounded-md">
        <div>
            <p className="font-medium">{license.name}</p>
            {license.file?.validUntil ? (
                <span className={`text-xs px-2 py-0.5 rounded-full ${getFileValidityStatus(license.file.validUntil).bg} ${getFileValidityStatus(license.file.validUntil).color}`}>
                    {getFileValidityStatus(license.file.validUntil).text}
                </span>
            ) : <p className="text-xs text-slate-500">אין תאריך תוקף</p>}
        </div>
        {license.file?.url && (
            <a href={license.file.url} target="_blank" rel="noopener noreferrer" className="p-2 text-sky-600 hover:bg-sky-100 rounded-full" title={`הורד ${license.name}`}>
                <ArrowDownTrayIcon className="w-5 h-5" />
            </a>
        )}
    </div>
);

const WorkerDetailsModal: React.FC<WorkerDetailsModalProps> = ({ isOpen, onClose, worker }) => {
  if (!worker) return null;

  const photoSrc = worker.photo?.url || worker.photo?.dataUrl;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="פרטי עובד" size="lg">
      <div className="space-y-6">
        <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
                {photoSrc ? (
                    <img src={photoSrc} alt={worker.name} className="w-24 h-24 rounded-full object-cover shadow-md" />
                ) : (
                    <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-3xl font-bold text-slate-500 shadow-md">
                        {getInitials(worker.name)}
                    </div>
                )}
            </div>
            <div className="flex-grow">
                <h2 className="text-2xl font-bold text-slate-800">{worker.name}</h2>
                <p className="text-slate-500">{worker.projectName}</p>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p className="flex items-center gap-2"><PhoneIcon className="w-4 h-4 text-slate-400"/> <a href={`tel:${worker.phone}`} className="text-sky-600 hover:underline">{worker.phone}</a></p>
                    <p className="flex items-center gap-2 truncate"><EnvelopeIcon className="w-4 h-4 text-slate-400"/> <a href={`mailto:${worker.email}`} className="text-sky-600 hover:underline truncate">{worker.email}</a></p>
                    <p className="flex items-center gap-2"><MapPinIcon className="w-4 h-4 text-slate-400"/> {worker.address || 'לא צוינה כתובת'}</p>
                </div>
            </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
            <div><p className="text-xs text-slate-500">ת.ז</p><p>{worker.idNumber}</p></div>
            <div><p className="text-xs text-slate-500">מספר עובד</p><p>{worker.workerNumber}</p></div>
        </div>
        
        <div className="space-y-3">
            <h3 className="font-semibold text-slate-700">היתרים ורישיונות</h3>
            {worker.workAtHeightPermit && <PermitRow permit={worker.workAtHeightPermit} label="היתר עבודה בגובה" />}
            {worker.safetyPermit && <PermitRow permit={worker.safetyPermit} label="היתר בטיחות" />}
            {worker.licenses.map(lic => <LicenseRow key={lic.id} license={lic} />)}
            {!worker.workAtHeightPermit && !worker.safetyPermit && worker.licenses.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">לא הוגדרו היתרים או רישיונות.</p>
            )}
        </div>
      </div>
    </Modal>
  );
};

export default WorkerDetailsModal;
