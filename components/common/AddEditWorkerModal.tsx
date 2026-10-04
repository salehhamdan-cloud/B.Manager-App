import React, { useState, useEffect, useCallback } from 'react';
import { Worker, License, PermitFile, Project, AnnotatedImage } from '../../types';
import Modal from './Modal';
import { useToast } from '../../contexts/ToastContext';
import { generateId } from '../../utils/idGenerator';
import { PlusIcon, TrashIcon } from '../icons/ActionIcons';
import ImageUploader from './ImageUploader';

// A small reusable component for handling a file upload along with its validity date.
const PermitInput: React.FC<{
    permit: Partial<PermitFile> | undefined;
    onChange: (updates: Partial<PermitFile>) => void;
    label: string;
}> = ({ permit, onChange, label }) => {
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                onChange({
                    id: permit?.id || generateId(),
                    name: file.name,
                    mimeType: file.type,
                    dataUrl: event.target?.result as string,
                    url: undefined, // Clear URL to indicate new upload
                    storagePath: undefined,
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ validUntil: e.target.value ? new Date(e.target.value).toISOString() : undefined });
    };

    return (
        <div>
            <label className="label-class">{label}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                <input
                    type="file"
                    onChange={handleFileChange}
                    className="file-input-class"
                />
                <input
                    type="date"
                    value={permit?.validUntil?.split('T')[0] || ''}
                    onChange={handleDateChange}
                    className="input-class"
                />
            </div>
            {permit?.name && <p className="text-xs text-slate-500 mt-1 truncate">קובץ נוכחי: {permit.name}</p>}
        </div>
    );
};

interface AddEditWorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (worker: Partial<Worker> & { projectId?: string }) => Promise<void>;
  worker: Partial<Worker> & { projectId?: string } | null;
  projects: Project[];
}

const AddEditWorkerModal: React.FC<AddEditWorkerModalProps> = ({ isOpen, onClose, onSave, worker, projects }) => {
    const [details, setDetails] = useState<Partial<Worker> & { projectId?: string }>({});
    const { addToast } = useToast();
    if (false) addToast('','success'); // Prevent unused variable error

    useEffect(() => {
        if (isOpen) {
            setDetails(worker || {
                projectId: projects.length === 1 ? projects[0].id : '',
                name: '', phone: '', email: '', address: '', idNumber: '', workerNumber: '',
                licenses: [],
            });
        }
    }, [isOpen, worker, projects]);

    const handleChange = (field: keyof Worker | 'projectId', value: any) => {
        setDetails(prev => ({ ...prev, [field]: value }));
    };

    const handlePhotoChange = useCallback((images: AnnotatedImage[]) => {
        if (images.length > 0) {
            const { id: _id, annotationData: _annotationData, createdAt: _createdAt, originalDataUrl: _originalDataUrl, ...photoData } = images[0];
            handleChange('photo', photoData);
        } else {
            handleChange('photo', undefined);
        }
    }, []);


    // --- License Handlers ---
    const addLicense = () => {
        const newLicense: License = { id: generateId(), name: '' };
        handleChange('licenses', [...(details.licenses || []), newLicense]);
    };

    const updateLicense = (id: string, updates: Partial<License>) => {
        const updatedLicenses = (details.licenses || []).map(lic =>
            lic.id === id ? { ...lic, ...updates } : lic
        );
        handleChange('licenses', updatedLicenses);
    };

    const removeLicense = (id: string) => {
        handleChange('licenses', (details.licenses || []).filter(lic => lic.id !== id));
    };

    const handleSave = () => {
        onSave(details);
    };
  
    if (!isOpen) return null;
    
    const photoForUploader: AnnotatedImage[] = details.photo ? [{
        id: 'worker-photo',
        ...details.photo,
        annotationData: '[]',
        createdAt: new Date().toISOString()
    }] : [];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={details.id ? "עריכת עובד" : "הוספת עובד חדש"} size="lg">
            <div className="space-y-4 max-h-[75vh] overflow-y-auto p-1">
                {projects.length > 1 && (
                    <div>
                        <label className="label-class">בניין*</label>
                        <select
                            value={details.projectId || ''}
                            onChange={e => handleChange('projectId', e.target.value)}
                            className="input-class w-full"
                        >
                            <option value="" disabled>בחר בניין...</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                )}
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="w-full sm:w-2/3 space-y-4">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input type="text" placeholder="שם מלא*" value={details.name || ''} onChange={e => handleChange('name', e.target.value)} className="input-class" />
                            <input type="text" placeholder="מספר ת.ז." value={details.idNumber || ''} onChange={e => handleChange('idNumber', e.target.value)} className="input-class" />
                            <input type="text" placeholder="מספר עובד" value={details.workerNumber || ''} onChange={e => handleChange('workerNumber', e.target.value)} className="input-class" />
                            <input type="tel" placeholder="טלפון" value={details.phone || ''} onChange={e => handleChange('phone', e.target.value)} className="input-class" />
                        </div>
                        <input type="email" placeholder="אימייל" value={details.email || ''} onChange={e => handleChange('email', e.target.value)} className="input-class w-full" />
                        <input type="text" placeholder="כתובת" value={details.address || ''} onChange={e => handleChange('address', e.target.value)} className="input-class w-full" />
                    </div>
                     <div className="w-full sm:w-1/3">
                        <label className="label-class">תמונת פרופיל</label>
                        <ImageUploader
                            images={photoForUploader}
                            onImagesChange={handlePhotoChange}
                            maxImages={1}
                            allowNotes={false}
                        />
                    </div>
                </div>
                
                <div className="pt-4 border-t space-y-3">
                    <h3 className="text-md font-semibold text-slate-700">היתרים</h3>
                    <PermitInput
                        label="היתר עבודה בגובה"
                        permit={details.workAtHeightPermit}
                        onChange={updates => handleChange('workAtHeightPermit', {...(details.workAtHeightPermit || {id: generateId()}), ...updates})}
                    />
                    <PermitInput
                        label="היתר בטיחות"
                        permit={details.safetyPermit}
                        onChange={updates => handleChange('safetyPermit', {...(details.safetyPermit || {id: generateId()}), ...updates})}
                    />
                </div>
                
                <div className="pt-4 border-t space-y-3">
                    <div className="flex justify-between items-center">
                        <h3 className="text-md font-semibold text-slate-700">רישיונות</h3>
                        <button type="button" onClick={addLicense} className="btn-secondary text-sm flex items-center gap-1"><PlusIcon className="w-4 h-4" /> הוסף רישיון</button>
                    </div>
                    {(details.licenses || []).map(lic => (
                        <div key={lic.id} className="p-3 bg-slate-50 rounded-md border space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="שם הרישיון (למשל, חשמלאי מוסמך)"
                                    value={lic.name}
                                    onChange={e => updateLicense(lic.id, { name: e.target.value })}
                                    className="input-class w-full"
                                />
                                <button type="button" onClick={() => removeLicense(lic.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full flex-shrink-0"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                            <PermitInput
                                label="קובץ ותוקף"
                                permit={lic.file}
                                onChange={updates => updateLicense(lic.id, { file: { ...(lic.file || {id: generateId(), name: '', mimeType: ''}), ...updates } })}
                            />
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={onClose} className="btn-secondary">ביטול</button>
                    <button type="button" onClick={handleSave} className="btn-primary">שמור עובד</button>
                </div>
            </div>
            <style>{`
                .label-class { display: block; margin-bottom: 0.25rem; font-size: 0.875rem; font-weight: 500; color: #334155; }
                .input-class { display: block; width: 100%; border: 1px solid #cbd5e1; border-radius: 0.375rem; padding: 0.5rem 0.75rem; }
                .file-input-class { display: block; width: 100%; text-sm text-slate-500 file:mr-4 file:rtl:ml-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 border border-slate-300 rounded-lg}
                .btn-primary { padding: 0.5rem 1rem; background-color: #0284c7; color: white; border-radius: 0.375rem; font-weight: 500; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-weight: 500; }
            `}</style>
        </Modal>
    );
};

export default AddEditWorkerModal;