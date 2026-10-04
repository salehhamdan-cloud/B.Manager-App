import React, { useState, useEffect, useCallback, ChangeEvent, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProjectForm, FormTemplate, FormAnswer, AnnotatedImage, FormItem, Signature } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ImageUploader from '../components/common/ImageUploader';
import SignaturePad from '../components/common/SignaturePad';
import Modal from '../components/common/Modal';
import { exportToCsv } from '../utils/exportUtils';
import { formatDate } from '../utils/dateFormatter';

const ProjectFormPage: React.FC = () => {
    const { projectId, reportId, formId } = useParams<{ projectId: string, reportId: string, formId: string }>();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [projectForm, setProjectForm] = useState<ProjectForm | null>(null);
    const [template, setTemplate] = useState<FormTemplate | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- Auto-save and Restore State ---
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [draftForm, setDraftForm] = useState<ProjectForm | null>(null);
    const debounceTimeoutRef = useRef<number | null>(null);
    const initialLoadDone = useRef(false);

    const autosaveKey = useMemo(() => `autosave-form-${formId}`, [formId]);
    
    const fetchFormData = useCallback(async () => {
        if (!formId) return;
        setIsLoading(true);
        try {
            const form = await dbService.getProjectForm(formId);
            if (form) {
                setProjectForm(form);
                const tmpl = await dbService.getFormTemplate(form.formTemplateId);
                if (tmpl) {
                    setTemplate(tmpl);
                    // Check for a newer draft after fetching data
                    const savedDraft = localStorage.getItem(autosaveKey);
                    if (savedDraft) {
                        const parsedDraft = JSON.parse(savedDraft) as ProjectForm;
                        if (new Date(parsedDraft.updatedAt) > new Date(form.updatedAt)) {
                            setDraftForm(parsedDraft);
                            setIsRestoreModalOpen(true);
                        } else {
                            localStorage.removeItem(autosaveKey); // Clean up old draft
                        }
                    }
                } else {
                    throw new Error("Template not found");
                }
            } else {
                throw new Error("Form not found");
            }
        } catch (error) {
            console.error("Error fetching form data:", error);
            addToast('שגיאה בטעינת הטופס', 'error');
            navigate(`/project/${projectId}/report/${reportId}`);
        } finally {
            setIsLoading(false);
            initialLoadDone.current = true;
        }
    }, [formId, projectId, reportId, navigate, addToast, autosaveKey]);

    useEffect(() => {
        fetchFormData();
    }, [fetchFormData]);

    // --- Auto-save Logic ---
    useEffect(() => {
        if (!initialLoadDone.current || isRestoreModalOpen || !projectForm || isLoading) return;
    
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    
        debounceTimeoutRef.current = window.setTimeout(() => {
            const formToSave = { ...projectForm, updatedAt: new Date().toISOString() };
            localStorage.setItem(autosaveKey, JSON.stringify(formToSave));
        }, 1500); // Save 1.5 seconds after the last change
    
        return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
    }, [projectForm, autosaveKey, isRestoreModalOpen, isLoading]);

    const updateAnswer = (itemId: string, updatedAnswer: Partial<FormAnswer>) => {
        if (!projectForm) return;
        const existingAnswerIndex = projectForm.answers.findIndex(a => a.formItemId === itemId);
        let newAnswers = [...projectForm.answers];
        
        if (existingAnswerIndex > -1) {
            newAnswers[existingAnswerIndex] = { ...newAnswers[existingAnswerIndex], ...updatedAnswer };
        } else {
            newAnswers.push({ formItemId: itemId, value: null, description: '', photos: [], ...updatedAnswer });
        }
        setProjectForm({ ...projectForm, answers: newAnswers });
    };

    const handleAnswerChange = (itemId: string, value: string | boolean) => {
        updateAnswer(itemId, { value });
    };

    const handleAnswerDescriptionChange = (itemId: string, description: string) => {
        updateAnswer(itemId, { description });
    };

    const handleSignatureSave = (type: 'reporter' | 'manager', dataUrl: string) => {
        if (!projectForm) return;
        const signature: Signature = {
            dataUrl,
            signedAt: new Date().toISOString(),
        };
        if (type === 'reporter') {
            setProjectForm(prev => ({ ...prev!, reporterSignature: signature }));
        } else {
            setProjectForm(prev => ({ ...prev!, managerSignature: signature }));
        }
    };

    const handleSignatureClear = (type: 'reporter' | 'manager') => {
        if (!projectForm) return;
        if (type === 'reporter') {
            setProjectForm(prev => {
                const { reporterSignature, ...rest } = prev!;
                return rest as ProjectForm;
            });
        } else {
            setProjectForm(prev => {
                const { managerSignature, ...rest } = prev!;
                return rest as ProjectForm;
            });
        }
    }

    const handleCommentsChange = (type: 'reporter' | 'manager', comments: string) => {
        if (!projectForm) return;
        if (type === 'reporter') {
            setProjectForm(prev => ({ ...prev!, reporterComments: comments }));
        } else {
            setProjectForm(prev => ({ ...prev!, managerComments: comments }));
        }
    }
    
    const handleSaveForm = async () => {
        if (!projectForm) return;
        try {
            await dbService.updateProjectForm({ ...projectForm, updatedAt: new Date().toISOString() });
            localStorage.removeItem(autosaveKey); // Clean up draft on successful save
            addToast('הטופס נשמר בהצלחה', 'success');
            navigate(`/project/${projectId}/report/${reportId}/forms`);
        } catch (error) {
            addToast('שגיאה בשמירת הטופס', 'error');
        }
    };

    const handleRestore = () => {
        if (draftForm) {
            setProjectForm(draftForm);
            addToast('התקדמות שוחזרה', 'success');
        }
        setIsRestoreModalOpen(false);
        setDraftForm(null);
    };

    const handleDiscard = () => {
        localStorage.removeItem(autosaveKey);
        addToast('טיוטה נמחקה', 'info');
        setIsRestoreModalOpen(false);
        setDraftForm(null);
    };
    
    const getAnswer = (itemId: string): FormAnswer | undefined => projectForm?.answers.find(a => a.formItemId === itemId);

    const handleExportCsv = () => {
        if (!projectForm || !template) return;
    
        const dataToExport: { 'קבוצה': string, 'שאלה': string, 'תשובה': string, 'הערות': string }[] = [];
        
        template.groups.forEach(group => {
            group.items.forEach(item => {
                const answer = projectForm.answers.find(a => a.formItemId === item.id);
                const value = answer?.value;
                let displayValue = '-';
                if (typeof value === 'boolean') displayValue = value ? 'כן' : 'לא';
                else if (value === 'ok') displayValue = 'תקין';
                else if (value === 'not-ok') displayValue = 'לא תקין';
                else if (value === 'na') displayValue = 'לא רלוונטי';
                else if (value) displayValue = String(value);
    
                dataToExport.push({
                    'קבוצה': group.name,
                    'שאלה': item.label,
                    'תשובה': displayValue,
                    'הערות': answer?.description || ''
                });
            });
        });
    
        if (projectForm.reporterComments) {
            dataToExport.push({ 'קבוצה': 'סיכום', 'שאלה': 'הערות מדווח', 'תשובה': projectForm.reporterComments, 'הערות': '' });
        }
        if (projectForm.managerComments) {
            dataToExport.push({ 'קבוצה': 'סיכום', 'שאלה': 'הערות מנהל', 'תשובה': projectForm.managerComments, 'הערות': '' });
        }
    
        exportToCsv(dataToExport, `form_${template.name}_${formatDate(projectForm.formDate)}`);
        addToast('הטופס יוצא לקובץ Excel...', 'success');
    };

    const renderFormItem = (item: FormItem) => {
        const answer = getAnswer(item.id);
        const photos = answer?.photos || [];

        const handleImagesChange = (newImages: AnnotatedImage[]) => {
            updateAnswer(item.id, { photos: newImages });
        };

        const shareContext = `מטופס: "${template?.name}"\nשאלה: "${item.label}"`;

        const isoToInputDate = (isoString?: string | boolean | null) => {
            if (!isoString || typeof isoString !== 'string') return '';
            try {
                return new Date(isoString).toISOString().split('T')[0];
            } catch (e) {
                return '';
            }
        };

        return (
            <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 space-y-3">
                <label className="block text-md font-semibold text-slate-800">{item.label}</label>
                {item.description && (
                    <p className="text-sm text-amber-900 bg-amber-100 p-3 rounded-md border-r-4 border-amber-400 rtl:border-l-4 rtl:border-r-0 my-2">{item.description}</p>
                )}
                
                {item.type === 'yes-no' && <div className="flex gap-4">{['כן', 'לא'].map(val => (
                    <label key={val} className="flex items-center gap-2"><input type="radio" name={item.id} checked={answer?.value === (val === 'כן')} onChange={() => handleAnswerChange(item.id, val === 'כן')} className="w-4 h-4 text-sky-600 focus:ring-sky-500" />{val}</label>
                ))}</div>}

                {item.type === 'ok-not-ok' && <div className="flex gap-4">{['תקין', 'לא תקין'].map(val => {
                    const valueToSet = val === 'תקין' ? 'ok' : 'not-ok';
                    return (
                        <label key={val} className="flex items-center gap-2">
                            <input
                                type="radio"
                                name={item.id}
                                checked={answer?.value === valueToSet}
                                onChange={() => handleAnswerChange(item.id, valueToSet)}
                                className="w-4 h-4 text-sky-600 focus:ring-sky-500"
                            />
                            {val}
                        </label>
                    );
                })}</div>}
                
                {item.type === 'ok-not-ok-na' && <div className="flex flex-wrap gap-4">{['תקין', 'לא תקין', 'לא רלוונטי'].map(val => {
                    let valueToSet: string;
                    if (val === 'תקין') valueToSet = 'ok';
                    else if (val === 'לא תקין') valueToSet = 'not-ok';
                    else valueToSet = 'na';

                    return (
                        <label key={val} className="flex items-center gap-2">
                            <input 
                                type="radio" 
                                name={item.id} 
                                checked={answer?.value === valueToSet} 
                                onChange={() => handleAnswerChange(item.id, valueToSet)} 
                                className="w-4 h-4 text-sky-600 focus:ring-sky-500" 
                            />
                            {val}
                        </label>
                    );
                })}</div>}

                {item.type === 'options' && <select value={String(answer?.value || '')} onChange={e => handleAnswerChange(item.id, e.target.value)} className="input-class">
                    <option value="">בחר...</option>
                    {item.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>}

                {item.type === 'text' && <textarea value={String(answer?.value || '')} onChange={e => handleAnswerChange(item.id, e.target.value)} rows={3} className="input-class" />}
                
                {item.type === 'date' && (
                    <input
                        type="date"
                        value={isoToInputDate(answer?.value)}
                        onChange={e => handleAnswerChange(item.id, e.target.value ? new Date(e.target.value).toISOString() : '')}
                        className="input-class"
                    />
                )}

                <div className="pt-3">
                    <label htmlFor={`desc-${item.id}`} className="block text-sm font-medium text-slate-600 mb-1">הערות / תיאור לתשובה (יופיע ב-PDF)</label>
                    <textarea
                        id={`desc-${item.id}`}
                        value={answer?.description || ''}
                        onChange={(e) => handleAnswerDescriptionChange(item.id, e.target.value)}
                        rows={2}
                        className="input-class w-full text-sm"
                        placeholder="הוסף הערה או הסבר לבחירה שלך..."
                    />
                </div>

                <div className="pt-3 border-t">
                     <ImageUploader 
                        images={photos}
                        onImagesChange={handleImagesChange}
                        maxImages={10}
                        allowSharing={true}
                        shareContextText={shareContext}
                     />
                </div>
            </div>
        );
    };

    if (isLoading) return <LoadingSpinner text="טוען טופס..." />;
    if (!projectForm || !template) return <div className="text-center text-red-500">לא ניתן לטעון את הטופס.</div>;

    return (
        <div className="max-w-3xl mx-auto animate-fadeIn space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-xl">
                <h2 className="text-2xl font-bold text-sky-700">{template.name}</h2>
                <p className="text-slate-600">{template.description}</p>
            </div>
            
            <div className="space-y-6">
                {template.groups.map(group => (
                    <section key={group.id} className="bg-slate-50 p-4 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold text-slate-800 border-b-2 border-sky-200 pb-2 mb-4">{group.name}</h3>
                        <div className="space-y-4">
                            {group.items.map(renderFormItem)}
                        </div>
                    </section>
                ))}
            </div>

            <section className="bg-slate-50 p-4 rounded-lg shadow-md mt-6">
                <h3 className="text-xl font-semibold text-slate-800 border-b-2 border-sky-200 pb-2 mb-4">אישורים וחתימות</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <label htmlFor="reporterComments" className="block text-md font-semibold text-slate-800">הערות מדווח</label>
                        <textarea
                            id="reporterComments"
                            value={projectForm?.reporterComments || ''}
                            onChange={e => handleCommentsChange('reporter', e.target.value)}
                            rows={3}
                            className="input-class w-full"
                            placeholder="הוסף הערות סיכום..."
                        />
                        <SignaturePad
                            title="חתימת מדווח"
                            onSave={(dataUrl) => handleSignatureSave('reporter', dataUrl)}
                            onClear={() => handleSignatureClear('reporter')}
                            signatureUrl={projectForm?.reporterSignature?.dataUrl}
                        />
                    </div>
                    <div className="space-y-3">
                        <label htmlFor="managerComments" className="block text-md font-semibold text-slate-800">הערות מנהל בניין</label>
                        <textarea
                            id="managerComments"
                            value={projectForm?.managerComments || ''}
                            onChange={e => handleCommentsChange('manager', e.target.value)}
                            rows={3}
                            className="input-class w-full"
                            placeholder="הוסף הערות סיכום..."
                        />
                        <SignaturePad
                            title="חתימת מנהל בניין"
                            onSave={(dataUrl) => handleSignatureSave('manager', dataUrl)}
                            onClear={() => handleSignatureClear('manager')}
                            signatureUrl={projectForm?.managerSignature?.dataUrl}
                        />
                    </div>
                </div>
            </section>

            <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={() => navigate(`/project/${projectId}/report/${reportId}/forms`)} className="btn-secondary">ביטול</button>
                <button type="button" onClick={handleExportCsv} className="btn-secondary">יצא לאקסל</button>
                <button type="button" onClick={handleSaveForm} className="btn-primary">שמור טופס</button>
            </div>

            <Modal isOpen={isRestoreModalOpen} onClose={handleDiscard} title="שחזור התקדמות">
                <div className="space-y-4">
                    <p className="text-slate-600">נמצאו שינויים שלא נשמרו עבור טופס זה. האם תרצה לשחזר אותם?</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={handleDiscard} className="btn-secondary">מחק טיוטה</button>
                        <button onClick={handleRestore} className="btn-primary">שחזר התקדמות</button>
                    </div>
                </div>
            </Modal>

            <style>{`
                .input-class { display: block; width: 100%; border: 1px solid #cbd5e1; border-radius: 0.375rem; padding: 0.5rem 0.75rem; transition: border-color 0.2s; }
                .input-class:focus { border-color: #0284c7; outline: none; box-shadow: 0 0 0 1px #0284c7; }
                .btn-primary { padding: 0.6rem 1.5rem; background-color: #0284c7; color: white; border-radius: 0.375rem; font-weight: 600; }
                .btn-primary:hover { background-color: #0369a1; }
                .btn-secondary { padding: 0.6rem 1.5rem; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-weight: 600; }
                .btn-secondary:hover { background-color: #e2e8f0; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fadeIn { animation: fadeIn 0.5s ease-in-out; }
            `}</style>
        </div>
    );
};

export default ProjectFormPage;