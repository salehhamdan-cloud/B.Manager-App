import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Problem, ProblemSeverity, AnnotatedImage, Project, Supplier, Tenant } from '../types';
import * as dbService from '../services/dbService';
import { generateId } from '../utils/idGenerator';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ImageUploader from '../components/common/ImageUploader';
import { SEVERITY_OPTIONS } from '../constants';
import { SparklesIcon } from '../components/icons/AiIcons';
import * as aiService from '../services/aiService.ts';
import Modal from '../components/common/Modal';
import { useSettings } from '../contexts/SettingsContext';
import * as emailService from '../services/emailService';

const ProblemEditorPage: React.FC = () => {
  const { projectId, reportId, problemId } = useParams<{ projectId: string; reportId: string; problemId?: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { settings } = useSettings();

  const [problem, setProblem] = useState<Partial<Problem>>({
    description: '',
    severity: ProblemSeverity.LOW,
    notes: '',
    images: [],
    locationTag: '',
    workerIds: [],
    supplierIds: [],
    tenantIds: [],
  });
  const [project, setProject] = useState<Project | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const isEditing = Boolean(problemId);

  // --- Auto-save and Restore State ---
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [draftProblem, setDraftProblem] = useState<Problem | null>(null);
  const debounceTimeoutRef = useRef<number | null>(null);
  const initialLoadDone = useRef(false);

  const autosaveKey = useMemo(() => {
    return `autosave-problem-${problemId || `new-${reportId}`}`;
  }, [problemId, reportId]);


  const fetchProblemData = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
        const [projectData, suppliersData] = await Promise.all([
            dbService.getProject(projectId),
            dbService.getAllSuppliers()
        ]);
        setProject(projectData);
        setSuppliers(suppliersData);

        if (isEditing && problemId) {
            const data = await dbService.getProblem(problemId);
            if (data) {
                setProblem(data);
                const savedDraft = localStorage.getItem(autosaveKey);
                if (savedDraft) {
                    const parsedDraft = JSON.parse(savedDraft) as Problem;
                    if (new Date(parsedDraft.updatedAt) > new Date(data.updatedAt)) {
                        setDraftProblem(parsedDraft);
                        setIsRestoreModalOpen(true);
                    } else {
                        localStorage.removeItem(autosaveKey);
                    }
                }
            } else {
                addToast('תקלה לא נמצאה', 'error');
                navigate(`/project/${projectId}/report/${reportId}`);
            }
        } else {
            const savedDraft = localStorage.getItem(autosaveKey);
            if (savedDraft) {
                setDraftProblem(JSON.parse(savedDraft));
                setIsRestoreModalOpen(true);
            }
        }
    } catch (error) {
        console.error("Error fetching data:", error);
        addToast('שגיאה בטעינת נתוני התקלה', 'error');
    } finally {
        setIsLoading(false);
        initialLoadDone.current = true;
    }
  }, [problemId, isEditing, addToast, navigate, projectId, reportId, autosaveKey]);

  useEffect(() => {
    fetchProblemData();
  }, [fetchProblemData]);

  // --- Auto-save Logic ---
  useEffect(() => {
    if (!initialLoadDone.current || isRestoreModalOpen || isLoading) return;

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    debounceTimeoutRef.current = window.setTimeout(() => {
      if (problem.description) { // Only save if there's at least a description
        const problemToSave = { ...problem, updatedAt: new Date().toISOString() };
        localStorage.setItem(autosaveKey, JSON.stringify(problemToSave));
      }
    }, 1500); // Save 1.5 seconds after the last change

    return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
  }, [problem, autosaveKey, isRestoreModalOpen, isLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if ((e.target as HTMLSelectElement).multiple) {
        const selectedIds = Array.from((e.target as HTMLSelectElement).selectedOptions, option => option.value);
        setProblem(prev => ({ ...prev, [name]: selectedIds }));
    } else {
        setProblem(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImagesChange = (newImages: AnnotatedImage[]) => {
    setProblem(prev => ({ ...prev, images: newImages }));
  };

  const handleAiDescribe = async () => {
      if (!problem.images || problem.images.length === 0) {
          addToast('יש להעלות תמונה תחילה כדי להשתמש בתיאור AI', 'warning');
          return;
      }
      setIsAiLoading(true);
      try {
          const image = problem.images[0];
          if (!image.dataUrl || !image.dataUrl.startsWith('data:')) {
            addToast('פורמט תמונה לא תקין לניתוח AI. נסה להעלות את התמונה מחדש.', 'error');
            setIsAiLoading(false);
            return;
          }
          const base64Data = image.dataUrl.split(',')[1];
          if (!base64Data) {
            addToast('לא ניתן היה לחלץ נתוני תמונה לניתוח.', 'error');
            setIsAiLoading(false);
            return;
          }

          const description = await aiService.generateDescriptionFromImage(base64Data, image.mimeType);
          setProblem(prev => ({ ...prev, description }));
          addToast('תיאור AI נוצר בהצלחה', 'success');
      } catch (error) {
          console.error("AI description error:", error);
          addToast(error instanceof Error ? error.message : 'שגיאה ביצירת תיאור AI', 'error');
      } finally {
          setIsAiLoading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem.description || !reportId) {
      addToast('תיאור התקלה הוא שדה חובה', 'warning');
      return;
    }

    setIsLoading(true);

    let problemOrder = problem.order ?? 0;
    if (!isEditing) {
        const existingProblems = await dbService.getProblemsByReportId(reportId);
        problemOrder = existingProblems.length;
    }
    
    const problemData: Problem = {
      id: isEditing && problem.id ? problem.id : generateId(),
      reportId: reportId,
      description: problem.description!,
      severity: problem.severity || ProblemSeverity.LOW,
      notes: problem.notes || '',
      images: problem.images || [],
      locationTag: problem.locationTag || '',
      workerIds: problem.workerIds || [],
      supplierIds: problem.supplierIds || [],
      tenantIds: problem.tenantIds || [],
      createdAt: isEditing && problem.createdAt ? problem.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: problemOrder,
    };

    try {
      if (isEditing) {
        await dbService.updateProblem(problemData);
        addToast('התקלה עודכנה בהצלחה', 'success');
      } else {
        await dbService.addProblem(problemData);
        addToast('תקלה חדשה נוספה בהצלחה', 'success');
      }

      // Check for critical issue email notification
      if (problemData.severity === ProblemSeverity.CRITICAL && settings.enableEmailNotifications && settings.notifyOnCriticalIssues) {
          if (settings.notificationEmailAddress) {
              const report = await dbService.getReport(reportId);
              const project = await dbService.getProject(projectId!);
              if(report && project) {
                  emailService.triggerCriticalIssueEmail(problemData, report, project, settings);
              }
          } else {
              addToast('לא הוגדרה כתובת מייל למשלוח התראות בהגדרות.', 'warning');
          }
      }

      localStorage.removeItem(autosaveKey); // Clean up draft on successful save
      navigate(`/project/${projectId}/report/${reportId}`);
    } catch (error) {
      console.error("Error saving problem:", error);
      addToast('שגיאה בשמירת התקלה', 'error');
      setIsLoading(false);
    }
  };

  const handleRestore = () => {
    if (draftProblem) {
        setProblem(draftProblem);
        addToast('התקדמות שוחזרה', 'success');
    }
    setIsRestoreModalOpen(false);
    setDraftProblem(null);
  };

  const handleDiscard = () => {
      localStorage.removeItem(autosaveKey);
      addToast('טיוטה נמחקה', 'info');
      setIsRestoreModalOpen(false);
      setDraftProblem(null);
  };

  if (isLoading) {
    return <LoadingSpinner text="טוען פרטי תקלה..." />;
  }

  return (
    <>
      <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200/90 animate-fadeIn">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">
          {isEditing ? 'עריכת תקלה' : 'הוספת תקלה חדשה'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="description" className="block text-sm font-semibold text-slate-700">תיאור התקלה *</label>
              <button 
                  type="button" 
                  onClick={handleAiDescribe}
                  disabled={isAiLoading || !problem.images?.length}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
                  title="צור תיאור אוטומטי מהתמונה הראשונה שהועלתה"
              >
                {isAiLoading ? <LoadingSpinner size="sm" /> : <SparklesIcon className="w-4 h-4 text-purple-600" />}
                <span>{isAiLoading ? 'מעבד...' : 'צור תיאור עם AI'}</span>
              </button>
            </div>
            <textarea
                name="description"
                id="description"
                value={problem.description}
                onChange={handleInputChange}
                rows={3}
                required
                placeholder="תאר את מהות התקלה או הליקוי שנמצא..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="severity" className="block text-sm font-semibold text-slate-700 mb-1.5">רמת חומרה</label>
              <select
                  name="severity"
                  id="severity"
                  value={problem.severity}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition font-medium"
              >
                {SEVERITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="locationTag" className="block text-sm font-semibold text-slate-700 mb-1.5">תגית מיקום (אופציונלי)</label>
              <input
                  type="text"
                  name="locationTag"
                  id="locationTag"
                  value={problem.locationTag || ''}
                  onChange={handleInputChange}
                  placeholder="לדוגמה: מטבח, קומה 2 - חדר 201"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-semibold text-slate-700 mb-1.5">הערות נוספות והנחיות לביצוע</label>
            <textarea
                name="notes"
                id="notes"
                value={problem.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="פרטים נוספים, המלצות לתיקון או מועד נדרש..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition"
            />
          </div>
          
          <div className="space-y-4 pt-5 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-700">שיוך גורמים מטפלים (אופציונלי)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                      <label htmlFor="workerIds" className="block text-xs font-semibold text-slate-600 mb-1">עובדי תחזוקה</label>
                      <select multiple name="workerIds" id="workerIds" value={problem.workerIds || []} onChange={handleInputChange} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none h-24">
                          {(project?.workers || []).map(worker => ( <option key={worker.id} value={worker.id}>{worker.name}</option>))}
                      </select>
                  </div>
                  <div>
                      <label htmlFor="supplierIds" className="block text-xs font-semibold text-slate-600 mb-1">קבלנים וספקים</label>
                      <select multiple name="supplierIds" id="supplierIds" value={problem.supplierIds || []} onChange={handleInputChange} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none h-24">
                          {suppliers.map(supplier => ( <option key={supplier.id} value={supplier.id}>{supplier.name} ({supplier.group})</option>))}
                      </select>
                  </div>
                  <div>
                      <label htmlFor="tenantIds" className="block text-xs font-semibold text-slate-600 mb-1">דיירים מושפעים</label>
                      <select multiple name="tenantIds" id="tenantIds" value={problem.tenantIds || []} onChange={handleInputChange} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none h-24">
                          {(project?.tenants || []).map(tenant => ( <option key={tenant.id} value={tenant.id}>{tenant.name}</option>))}
                      </select>
                  </div>
              </div>
          </div>

          <div className="pt-5 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 mb-3">תמונות התקלה ושרטוטים</h3>
            <ImageUploader images={problem.images || []} onImagesChange={handleImagesChange} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
                type="button"
                onClick={() => navigate(`/project/${projectId}/report/${reportId}`)}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              ביטול
            </button>
            <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading && <LoadingSpinner size="sm" />}
              <span>{isEditing ? 'שמור שינויים' : 'הוסף תקלה'}</span>
            </button>
          </div>
        </form>
      </div>

      <Modal isOpen={isRestoreModalOpen} onClose={handleDiscard} title="שחזור התקדמות">
          <div className="space-y-4">
              <p className="text-slate-600 text-sm">נמצאו שינויים שלא נשמרו עבור תקלה זו. האם תרצה לשחזר אותם?</p>
              <div className="flex justify-end gap-3 pt-2">
                  <button onClick={handleDiscard} className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition">מחק טיוטה</button>
                  <button onClick={handleRestore} className="px-5 py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white transition shadow-xs">שחזר התקדמות</button>
              </div>
          </div>
      </Modal>
    </>
  );
};

export default ProblemEditorPage;