
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Project, ProjectImage, AnnotatedImage, ProjectBackup } from '../types';
import * as dbService from '../services/dbService';
import BuildingItem from '../components/ProjectItem';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { generateId } from '../utils/idGenerator';
import { useToast } from '../contexts/ToastContext';
import { BuildingOfficeIcon, PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from '../components/icons';
import ImageUploader from '../components/common/ImageUploader';
import { useTranslation } from '../src/i18n';

const SortButton: React.FC<{ label: string; value: string; currentSort: string; setSort: (value: string) => void }> = ({ label, value, currentSort, setSort }) => (
    <button
        onClick={() => setSort(value)}
        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
            currentSort === value 
            ? 'bg-white dark:bg-neutral-900 shadow-2xs text-blue-600 dark:text-blue-400 font-bold border border-neutral-200 dark:border-neutral-700' 
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-white/60 dark:hover:bg-neutral-800/60'
        }`}
    >
        {label}
    </button>
);


const BuildingsListPage: React.FC = () => {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
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
        { value: 'createdAt-desc', label: t('sortCreated', 'החדש ביותר') },
        { value: 'createdAt-asc', label: t('sortCreated', 'הישן ביותר') },
        { value: 'updatedAt-desc', label: t('sortUpdated', 'עודכן לאחרונה') },
        { value: 'name-asc', label: t('sortName', 'שם') },
  ], [t]);

  const sortedProjects = useMemo(() => {
    let filtered = [...projects];
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.address && p.address.toLowerCase().includes(q)) ||
        (p.managerName && p.managerName.toLowerCase().includes(q))
      );
    }
    const sorted = filtered;
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
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* 1. Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <BuildingOfficeIcon className="w-6 h-6" />
            {t('buildingsList', 'רשימת בניינים')}
            <span className="text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40 px-2.5 py-0.5 rounded-full font-bold">
              {sortedProjects.length} {t('propertiesCount', 'נכסים')}
            </span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {t('managePropertiesSubtitle', 'ניהול כל הנכסים, פרטי קשר, קומות, מערכות ודיירים.')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 overflow-x-auto">
            {sortOptions.map(opt => (
              <SortButton key={opt.value} label={opt.label} value={opt.value} currentSort={sortOrder} setSort={setSortOrder} />
            ))}
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-xs transition"
          >
            <PlusIcon className="w-4 h-4 text-white" />
            <span>{t('newBuilding', 'הוסף בניין')}</span>
          </button>
        </div>
      </div>

      {/* 2. Search Input */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute top-2.5 left-3 w-4 h-4 text-neutral-400 rtl:right-3 rtl:left-auto pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('searchBuildings', 'חפש בניין לפי שם, כתובת, מנהל...')}
          className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 text-xs border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        className="hidden"
        accept=".json,application/json"
      />

      {/* 3. Responsive 3-Column Grid */}

      {sortedProjects.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xs border border-neutral-200 dark:border-neutral-800 p-8">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
                <BuildingOfficeIcon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{t('noBuildingsFound', 'אין בניינים להצגה')}</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-1">{t('noSystemsFoundPrompt', 'התחל על ידי הוספת בניין חדש או ייבוא נתונים חכם ב-AI.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {sortedProjects.map(project => (
            <BuildingItem key={project.id} project={project} onDelete={handleDeleteProject} />
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="הוספת בניין חדש" size="lg">
        <form onSubmit={handleSubmitNewProject} className="space-y-4">
            <div>
                <label htmlFor="project-name" className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">שם הבניין*</label>
                <input type="text" id="project-name" name="name" value={newProject.name || ''} onChange={handleInputChange} required className="w-full text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"/>
            </div>
            <div>
                <label htmlFor="project-address" className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">כתובת</label>
                <input type="text" id="project-address" name="address" value={newProject.address || ''} onChange={handleInputChange} className="w-full text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"/>
            </div>
            <div>
                <label htmlFor="project-clientInfo" className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">פרטי לקוח</label>
                <textarea id="project-clientInfo" name="clientInfo" value={newProject.clientInfo || ''} onChange={handleInputChange} rows={3} className="w-full text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                 <div>
                    <label htmlFor="numberOfFloors" className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">קומות</label>
                    <input type="number" id="numberOfFloors" name="numberOfFloors" value={newProject.numberOfFloors || ''} onChange={handleInputChange} className="w-full text-xs font-medium font-mono bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"/>
                </div>
                <div>
                    <label htmlFor="buildingArea" className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">שטח (מ"ר)</label>
                    <input type="number" id="buildingArea" name="buildingArea" value={newProject.buildingArea || ''} onChange={handleInputChange} className="w-full text-xs font-medium font-mono bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"/>
                </div>
                 <div>
                    <label htmlFor="parkingSpots" className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">חניות</label>
                    <input type="number" id="parkingSpots" name="parkingSpots" value={newProject.parkingSpots || ''} onChange={handleInputChange} className="w-full text-xs font-medium font-mono bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"/>
                </div>
            </div>
             <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 mb-3">פרטי מנהל בניין</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="managerName" className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">שם מנהל</label>
                        <input type="text" id="managerName" name="managerName" value={newProject.managerName || ''} onChange={handleInputChange} className="w-full text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all" />
                    </div>
                    <div>
                        <label htmlFor="managerPhone" className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">טלפון</label>
                        <input type="tel" id="managerPhone" name="managerPhone" value={newProject.managerPhone || ''} onChange={handleInputChange} className="w-full text-xs font-medium font-mono bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all" />
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="managerEmail" className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">אימייל</label>
                        <input type="email" id="managerEmail" name="managerEmail" value={newProject.managerEmail || ''} onChange={handleInputChange} className="w-full text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all" />
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <ImageUploader images={imagesForUploader} onImagesChange={handleProjectImagesChange} maxImages={5} allowNotes={false} />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-xs">ביטול</button>
                <button type="submit" className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs text-xs">צור בניין</button>
            </div>
        </form>
      </Modal>
    </div>
  );
};

export default BuildingsListPage;
