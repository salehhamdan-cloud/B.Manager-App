
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Project, ProjectImage, AnnotatedImage, ProjectBackup } from '../types';
import * as dbService from '../services/dbService';
import BuildingItem from '../components/ProjectItem';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { generateId } from '../utils/idGenerator';
import { useToast } from '../contexts/ToastContext';
import { PlusIcon, ArrowDownTrayIcon } from '../components/icons/ActionIcons';
import ImageUploader from '../components/common/ImageUploader';

const SortButton: React.FC<{ label: string; value: string; currentSort: string; setSort: (value: string) => void }> = ({ label, value, currentSort, setSort }) => (
    <button
        onClick={() => setSort(value)}
        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
            currentSort === value 
            ? 'bg-white shadow-xs text-sky-800 font-black border border-slate-200/80' 
            : 'text-slate-600 hover:bg-white/60'
        }`}
    >
        {label}
    </button>
);


const BuildingsListPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<string>('createdAt-desc');
  const [newProject, setNewProject] = useState<Partial<Project>>({
    name: '',
    address: '',
    clientInfo: '',
    images: [],
    files: [],
    todos: [],
    numberOfFloors: undefined,
    buildingArea: undefined,
    parkingSpots: undefined,
    managerName: '',
    managerPhone: '',
    managerEmail: '',
  });
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const projectsData = await dbService.getAllProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error("Error fetching page data:", error);
      addToast('שגיאה בטעינת נתונים', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const sortOptions = useMemo(() => [
        { value: 'createdAt-desc', label: 'החדש ביותר' },
        { value: 'createdAt-asc', label: 'הישן ביותר' },
        { value: 'updatedAt-desc', label: 'עודכן לאחרונה' },
        { value: 'name-asc', label: 'שם (א-ת)' },
        { value: 'name-desc', label: 'שם (ת-א)' },
  ], []);

  const sortedProjects = useMemo(() => {
    const sorted = [...projects];
    const [key, direction] = sortOrder.split('-');

    sorted.sort((a, b) => {
        let valA, valB;

        switch (key) {
            case 'name':
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
                break;
            case 'updatedAt':
                valA = new Date(a.updatedAt).getTime();
                valB = new Date(b.updatedAt).getTime();
                break;
            case 'createdAt':
            default:
                valA = new Date(a.createdAt).getTime();
                valB = new Date(b.createdAt).getTime();
                break;
        }

        if (valA < valB) {
            return direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
            return direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    return sorted;
  }, [projects, sortOrder]);


  const handleDeleteProject = async (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק בניין זה וכל הדוחות הקשורים אליו?')) {
      try {
        const reports = await dbService.getReportsByProjectId(id);
        for (const report of reports) {
          await dbService.deleteReport(report.id);
        }
        await dbService.deleteProject(id);
        addToast('הבניין נמחק בהצלחה', 'success');
        fetchAllData(); // Refresh list
      } catch (error) {
        console.error("Error deleting project:", error);
        addToast('שגיאה במחיקת הבניין', 'error');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setNewProject(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
    } else {
      setNewProject(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleProjectImagesChange = (annotatedImages: AnnotatedImage[]) => {
    const projectImages: ProjectImage[] = annotatedImages.map(ai => ({
      id: ai.id,
      dataUrl: ai.dataUrl,
      name: ai.name,
      mimeType: ai.mimeType,
      uploadedAt: ai.createdAt,
    }));
    setNewProject(prev => ({ ...prev, images: projectImages }));
  };

  const handleSubmitNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name) {
      addToast('שם הבניין הוא שדה חובה', 'warning');
      return;
    }
    const projectToAdd: Project = {
      id: generateId(),
      name: newProject.name!,
      address: newProject.address || '',
      clientInfo: newProject.clientInfo || '',
      status: 'פעיל',
      managerName: newProject.managerName || '',
      managerPhone: newProject.managerPhone || '',
      managerEmail: newProject.managerEmail || '',
      numberOfFloors: newProject.numberOfFloors,
      buildingArea: newProject.buildingArea,
      parkingSpots: newProject.parkingSpots,
      images: newProject.images || [],
      files: [],
      todos: [],
      inventory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await dbService.addProject(projectToAdd);
      addToast('בניין חדש נוסף בהצלחה', 'success');
      setIsModalOpen(false);
      setNewProject({ name: '', address: '', clientInfo: '', images: [], files: [], todos: [], numberOfFloors: undefined, buildingArea: undefined, parkingSpots: undefined, managerName: '', managerPhone: '', managerEmail: '' }); // Reset form
      fetchAllData();
    } catch (error) {
      console.error("Error adding project:", error);
      addToast('שגיאה בהוספת הבניין', 'error');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
        addToast('נא לבחור קובץ JSON תקין.', 'error');
        return;
    }

    try {
        const text = await file.text();
        const backupData = JSON.parse(text) as ProjectBackup;
        // Basic validation
        if (!backupData.project || !backupData.reports || !backupData.problems || !backupData.forms) {
             throw new Error("Invalid backup file structure.");
        }
        
        addToast('ייבוא פרויקט בודד אינו נתמך כרגע. השתמש בייבוא גלובלי מהגדרות.', 'warning');
        // await dbService.importProjectBackup(backupData);
        // addToast('הבניין יובא בהצלחה!', 'success');
        // fetchAllData(); // Refresh the list
    } catch (error) {
        console.error("Error importing project:", error);
        addToast('שגיאה בייבוא הבניין. הקובץ עשוי להיות פגום.', 'error');
    } finally {
        // Reset file input to allow importing the same file again
        if(event.target) event.target.value = '';
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="טוען נתונים..." />;
  }

  const imagesForUploader: AnnotatedImage[] = (newProject.images || []).map(pImg => ({
    id: pImg.id,
    dataUrl: pImg.dataUrl,
    originalDataUrl: pImg.dataUrl,
    annotationData: '[]',
    name: pImg.name,
    mimeType: pImg.mimeType || 'image/jpeg',
    createdAt: pImg.uploadedAt || new Date().toISOString(),
  }));

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3 flex-wrap">
            <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    רשימת בניינים
                    <span className="text-xs bg-sky-50 text-sky-800 border border-sky-100 px-2.5 py-0.5 rounded-full font-bold">
                        {sortedProjects.length} נכסים
                    </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">ניהול כל הנכסים, פרטי קשר, קומות ודיירים</p>
            </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/60 overflow-x-auto">
                {sortOptions.map(opt => (
                    <SortButton key={opt.value} label={opt.label} value={opt.value} currentSort={sortOrder} setSort={setSortOrder} />
                ))}
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={handleImportClick}
                    disabled
                    className="btn-secondary text-xs py-2 px-3 opacity-50 cursor-not-allowed"
                    title="ייבוא פרויקט בודד אינו נתמך כרגע. לייבוא גיבוי מלא, עבור למסך ההגדרות."
                >
                    <ArrowDownTrayIcon className="w-4 h-4 me-1 rtl:ml-1" />
                    ייבוא
                </button>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary text-xs font-bold py-2.5 px-4 shadow-sm flex items-center"
                >
                    <PlusIcon className="w-4 h-4 me-1 rtl:ml-1" />
                    הוסף בניין
                </button>
            </div>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        className="hidden"
        accept=".json,application/json"
      />

      {sortedProjects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-slate-200/90 p-8">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                <PlusIcon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">אין בניינים להצגה</h3>
            <p className="text-slate-500 text-xs mt-1">התחל על ידי הוספת בניין חדש או ייבוא נתונים חכם ב-AI.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProjects.map(project => (
            <BuildingItem key={project.id} project={project} onDelete={handleDeleteProject} />
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="הוספת בניין חדש" size="lg">
        <form onSubmit={handleSubmitNewProject} className="space-y-4">
            <div>
                <label htmlFor="project-name" className="block text-xs font-bold text-slate-700 mb-1.5">שם הבניין*</label>
                <input type="text" id="project-name" name="name" value={newProject.name || ''} onChange={handleInputChange} required className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"/>
            </div>
            <div>
                <label htmlFor="project-address" className="block text-xs font-bold text-slate-700 mb-1.5">כתובת</label>
                <input type="text" id="project-address" name="address" value={newProject.address || ''} onChange={handleInputChange} className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"/>
            </div>
            <div>
                <label htmlFor="project-clientInfo" className="block text-xs font-bold text-slate-700 mb-1.5">פרטי לקוח</label>
                <textarea id="project-clientInfo" name="clientInfo" value={newProject.clientInfo || ''} onChange={handleInputChange} rows={3} className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                 <div>
                    <label htmlFor="numberOfFloors" className="block text-xs font-bold text-slate-700 mb-1.5">קומות</label>
                    <input type="number" id="numberOfFloors" name="numberOfFloors" value={newProject.numberOfFloors || ''} onChange={handleInputChange} className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"/>
                </div>
                <div>
                    <label htmlFor="buildingArea" className="block text-xs font-bold text-slate-700 mb-1.5">שטח (מ"ר)</label>
                    <input type="number" id="buildingArea" name="buildingArea" value={newProject.buildingArea || ''} onChange={handleInputChange} className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"/>
                </div>
                 <div>
                    <label htmlFor="parkingSpots" className="block text-xs font-bold text-slate-700 mb-1.5">חניות</label>
                    <input type="number" id="parkingSpots" name="parkingSpots" value={newProject.parkingSpots || ''} onChange={handleInputChange} className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"/>
                </div>
            </div>
             <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 mb-3">פרטי מנהל בניין</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="managerName" className="block text-xs font-bold text-slate-700 mb-1.5">שם מנהל</label>
                        <input type="text" id="managerName" name="managerName" value={newProject.managerName || ''} onChange={handleInputChange} className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all" />
                    </div>
                    <div>
                        <label htmlFor="managerPhone" className="block text-xs font-bold text-slate-700 mb-1.5">טלפון</label>
                        <input type="tel" id="managerPhone" name="managerPhone" value={newProject.managerPhone || ''} onChange={handleInputChange} className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all" />
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="managerEmail" className="block text-xs font-bold text-slate-700 mb-1.5">אימייל</label>
                        <input type="email" id="managerEmail" name="managerEmail" value={newProject.managerEmail || ''} onChange={handleInputChange} className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all" />
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
                <ImageUploader images={imagesForUploader} onImagesChange={handleProjectImagesChange} maxImages={5} allowNotes={false} />
            </div>

            <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs">ביטול</button>
                <button type="submit" className="btn-primary text-xs font-bold">צור בניין</button>
            </div>
        </form>
      </Modal>
    </div>
  );
};

export default BuildingsListPage;
