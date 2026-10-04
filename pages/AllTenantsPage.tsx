import React, { useState, useEffect, useCallback, useMemo, useRef, ChangeEvent } from 'react';
import { TenantWithContext, Tenant, Project } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ArrowDownTrayIcon, PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '../components/icons/ActionIcons';
import CollapsibleSection from '../components/common/CollapsibleSection';
import { exportToCsv } from '../utils/exportUtils';
import { useSettings } from '../contexts/SettingsContext';
import { SparklesIcon } from '../components/icons/AiIcons';
import Modal from '../components/common/Modal';
import { convertPdfToText } from '../utils/pdfUtils';
import * as aiService from '../services/aiService.ts';
import { generateId } from '../utils/idGenerator';
import { generateAllTenantsPdf } from '../services/pdfService';
import { PhoneIcon, EnvelopeIcon } from '../components/icons/ContactIcons';

const AllTenantsPage: React.FC = () => {
    const [tenants, setTenants] = useState<TenantWithContext[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();
    const { settings } = useSettings();

    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedTenants, setParsedTenants] = useState<Partial<Tenant>[]>([]);
    const [isProjectSelectionModalOpen, setIsProjectSelectionModalOpen] = useState(false);
    const [selectedProjectIdForImport, setSelectedProjectIdForImport] = useState('');
    
    const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Partial<TenantWithContext> | null>(null);
    const [viewingTenant, setViewingTenant] = useState<TenantWithContext | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [leaseFilter, setLeaseFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');
    
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedTenants, setSelectedTenants] = useState<Record<string, boolean>>({});
    const selectedCount = Object.keys(selectedTenants).length;

    const currency = settings.currencySymbol || '₪';

    const getLeaseStatus = (endDate?: string) => {
        if (!endDate) return { label: 'ללא תאריך', color: 'bg-slate-100 text-slate-600', type: 'unknown' };
        const now = new Date();
        const end = new Date(endDate);
        const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return { label: 'פג תוקף', color: 'bg-red-100 text-red-800 border border-red-200', type: 'expired' };
        if (diffDays <= 30) return { label: `מסתיים בקרוב (${diffDays} ימים)`, color: 'bg-amber-100 text-amber-800 border border-amber-200', type: 'expiring' };
        return { label: 'פעיל', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200', type: 'active' };
    };


    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [tenantsData, projectsData] = await Promise.all([
                dbService.getAllTenantsWithContext(),
                dbService.getAllProjects()
            ]);
            setTenants(tenantsData);
            setProjects(projectsData);
        } catch (error) {
            addToast('שגיאה בטעינת דיירים', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        // When exiting edit mode, clear selection
        if (!isEditMode) {
            setSelectedTenants({});
        }
    }, [isEditMode]);
    
    const openModal = (tenant: Partial<TenantWithContext> | null = null) => {
        if (tenant) {
            setEditingTenant({ ...tenant });
        } else {
            // Default to first project if only one exists
            setEditingTenant({ projectId: projects.length === 1 ? projects[0].id : '' });
        }
        setIsTenantModalOpen(true);
    };
    
    const handleDeleteTenant = async (tenantToDelete: TenantWithContext) => {
        if (!window.confirm(`האם אתה בטוח שברצונך למחוק את הדייר "${tenantToDelete.name}"?`)) return;

        try {
            await dbService.deleteTenants([tenantToDelete]);
            addToast('הדייר נמחק בהצלחה', 'success');
            fetchData();
        } catch (error) {
            addToast('שגיאה במחיקת הדייר', 'error');
        }
    };


    const handleSaveTenant = async () => {
        if (!editingTenant || !editingTenant.projectId || !editingTenant.name?.trim()) {
            addToast('יש לבחור בניין ולהזין שם דייר', 'warning');
            return;
        }

        const projectToUpdate = await dbService.getProject(editingTenant.projectId);
        if (!projectToUpdate) {
            addToast('הבניין הנבחר לא נמצא', 'error');
            return;
        }

        let updatedTenants: Tenant[];
        
        if (editingTenant.id) { // Editing existing tenant
             const { projectId, projectName, ...tenantData } = editingTenant;
             updatedTenants = (projectToUpdate.tenants || []).map(t =>
                t.id === tenantData.id ? { 
                    ...t, 
                    ...tenantData,
                    name: editingTenant.name!.trim(),
                    rentAmount: Number(editingTenant.rentAmount) || 0
                } as Tenant : t
            );
        } else { // Adding new tenant
            const newTenantToAdd: Tenant = {
                id: generateId(),
                name: editingTenant.name.trim(),
                phone: editingTenant.phone || '',
                email: editingTenant.email || '',
                building: editingTenant.building || '',
                floor: editingTenant.floor || '',
                officeNumber: editingTenant.officeNumber || '',
                officeSpace: editingTenant.officeSpace || '',
                companyId: editingTenant.companyId || '',
                apartmentNumber: editingTenant.apartmentNumber || editingTenant.officeNumber || '',
                floorNumber: editingTenant.floorNumber || editingTenant.floor || '',
                leaseStartDate: editingTenant.leaseStartDate || '',
                leaseEndDate: editingTenant.leaseEndDate || '',
                rentAmount: Number(editingTenant.rentAmount) || 0,
                paymentStatus: editingTenant.paymentStatus || 'שולם',
                contactPerson: editingTenant.contactPerson || '',
                emergencyContact: editingTenant.emergencyContact || '',
                notes: editingTenant.notes || '',
            };
            updatedTenants = [...(projectToUpdate.tenants || []), newTenantToAdd];
        }

        const updatedProject: Project = {
            ...projectToUpdate,
            tenants: updatedTenants,
            updatedAt: new Date().toISOString(),
        };

        try {
            await dbService.updateProject(updatedProject);
            addToast(editingTenant.id ? 'הדייר עודכן בהצלחה!' : 'הדייר נוסף בהצלחה!', 'success');
            setIsTenantModalOpen(false);
            setEditingTenant(null);
            fetchData();
        } catch (error) {
            addToast('שגיאה בשמירת הדייר', 'error');
        }
    };

    const handleExportCsv = () => {
        const tenantsToExport = selectedCount > 0 && isEditMode ? tenants.filter(t => selectedTenants[t.id]) : tenants;
        if (tenantsToExport.length === 0) {
            addToast('לא נבחרו דיירים לייצוא', 'warning');
            return;
        }

        const dataToExport = tenantsToExport.map(t => ({
            'בניין': t.projectName,
            'שם': t.name,
            'טלפון': t.phone,
            'מייל': t.email,
            'אגף': t.building,
            'קומה': t.floor,
            'משרד': t.officeNumber,
            'שטח': t.officeSpace,
            'ח.פ': t.companyId || '',
        }));
        exportToCsv(dataToExport, selectedCount > 0 && isEditMode ? 'selected_tenants_list' : 'all_tenants_list');
    };

    const handleExportPdf = () => {
        const tenantsToExport = selectedCount > 0 && isEditMode ? tenants.filter(t => selectedTenants[t.id]) : tenants;
        if (tenantsToExport.length === 0) {
            addToast('לא נבחרו דיירים לייצוא', 'warning');
            return;
        }
        addToast('מכין PDF...', 'info');
        try {
            generateAllTenantsPdf({ settings, tenants: tenantsToExport });
        } catch (e) {
            addToast('שגיאה ביצירת PDF', 'error');
            console.error("PDF generation failed:", e);
        }
    };
    
    const handleAiImport = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAiProcessing(true);
        addToast('מעבד קובץ דיירים...', 'info');

        try {
            let text = '';
            const reader = new FileReader();
            
            if (file.type === 'application/pdf') {
                 const dataUrl = await new Promise<string>((resolve, reject) => {
                    reader.onload = (event) => resolve(event.target?.result as string);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(file);
                });
                text = await convertPdfToText(dataUrl);
            } else if (file.type === 'text/csv') {
                text = await new Promise<string>((resolve, reject) => {
                    reader.onload = (event) => resolve(event.target?.result as string);
                    reader.onerror = (error) => reject(error);
                    reader.readAsText(file);
                });
            } else {
                throw new Error('סוג קובץ לא נתמך. יש להעלות PDF או CSV.');
            }
            
            const aiTenants = await aiService.generateTenantsFromText(text);
            
            if (aiTenants.length === 0) {
                addToast('לא נמצאו דיירים בקובץ.', 'warning');
                return;
            }

            setParsedTenants(aiTenants);
            setSelectedProjectIdForImport(projects.length === 1 ? projects[0].id : '');
            setIsProjectSelectionModalOpen(true);

        } catch (error) {
            addToast(error instanceof Error ? error.message : 'שגיאה ביבוא הדיירים', 'error');
        } finally {
            setIsAiProcessing(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleConfirmImport = async () => {
        if (!selectedProjectIdForImport || parsedTenants.length === 0) {
            addToast('יש לבחור בניין', 'warning');
            return;
        }
        
        const projectToUpdate = await dbService.getProject(selectedProjectIdForImport);
        if (!projectToUpdate) {
            addToast('בניין לא נמצא', 'error');
            return;
        }

        const newTenants: Tenant[] = parsedTenants.map(t => ({
            id: generateId(),
            name: t.name || 'N/A',
            phone: t.phone || '',
            email: t.email || '',
            building: t.building || '',
            floor: t.floor || '',
            officeNumber: t.officeNumber || '',
            officeSpace: t.officeSpace || '',
            companyId: t.companyId || '',
        }));

        const updatedProject: Project = {
            ...projectToUpdate,
            tenants: [...(projectToUpdate.tenants || []), ...newTenants],
            updatedAt: new Date().toISOString(),
        };

        try {
            await dbService.updateProject(updatedProject);
            addToast(`${newTenants.length} דיירים נוספו בהצלחה לבניין "${projectToUpdate.name}"!`, 'success');
            setIsProjectSelectionModalOpen(false);
            setParsedTenants([]);
            fetchData();
        } catch (error) {
            addToast('שגיאה בשמירת הדיירים', 'error');
        }
    };

    const filteredTenants = useMemo(() => {
        let result = tenants;
        if (leaseFilter !== 'all') {
            result = result.filter(t => {
                const status = getLeaseStatus(t.leaseEndDate);
                return status.type === leaseFilter;
            });
        }
        if (!searchTerm) return result;
        const lowercasedTerm = searchTerm.toLowerCase();
        return result.filter(t => 
            t.name.toLowerCase().includes(lowercasedTerm) ||
            t.phone.toLowerCase().includes(lowercasedTerm) ||
            t.email.toLowerCase().includes(lowercasedTerm) ||
            (t.apartmentNumber || '').toLowerCase().includes(lowercasedTerm) ||
            (t.contactPerson || '').toLowerCase().includes(lowercasedTerm) ||
            (t.emergencyContact || '').toLowerCase().includes(lowercasedTerm) ||
            t.building.toLowerCase().includes(lowercasedTerm) ||
            t.floor.toLowerCase().includes(lowercasedTerm) ||
            t.officeNumber.toLowerCase().includes(lowercasedTerm) ||
            (t.companyId || '').toLowerCase().includes(lowercasedTerm) ||
            t.projectName.toLowerCase().includes(lowercasedTerm)
        );
    }, [tenants, searchTerm, leaseFilter]);

    const groupedTenants = useMemo(() => {
        return filteredTenants.reduce((acc, tenant) => {
            const key = tenant.projectName;
            if (!acc[key]) acc[key] = { projectId: tenant.projectId, tenants: [] };
            acc[key].tenants.push(tenant);
            return acc;
        }, {} as Record<string, { projectId: string; tenants: TenantWithContext[] }>);
    }, [filteredTenants]);

    const sortedProjectKeys = useMemo(() => Object.keys(groupedTenants).sort((a,b) => a.localeCompare(b, 'he')), [groupedTenants]);
    
    const handleSelectAllForGroup = (tenantsInGroup: TenantWithContext[], isChecked: boolean) => {
        setSelectedTenants(prev => {
            const newSelection = { ...prev };
            tenantsInGroup.forEach(tenant => {
                if (isChecked) {
                    newSelection[tenant.id] = true;
                } else {
                    delete newSelection[tenant.id];
                }
            });
            return newSelection;
        });
    };

    const handleSelectTenant = (tenantId: string) => {
        setSelectedTenants(prev => {
            const newSelection = { ...prev };
            if (newSelection[tenantId]) {
                delete newSelection[tenantId];
            } else {
                newSelection[tenantId] = true;
            }
            return newSelection;
        });
    };

    const handleDeleteSelected = async () => {
        if (selectedCount === 0) return;
        if (window.confirm(`האם למחוק ${selectedCount} דיירים נבחרים?`)) {
            const tenantsToDelete = tenants.filter(t => selectedTenants[t.id]);
            try {
                await dbService.deleteTenants(tenantsToDelete);
                addToast(`${selectedCount} דיירים נמחקו`, 'success');
                setSelectedTenants({});
                fetchData();
            } catch (error) {
                addToast('שגיאה במחיקת דיירים', 'error');
            }
        }
    };


    if (isLoading) return <LoadingSpinner text="טוען דיירים..." />;

    return (
        <div className="space-y-6">
            {isAiProcessing && (
                <div className="fixed inset-0 bg-slate-900 bg-opacity-60 backdrop-blur-sm z-[1001] flex items-center justify-center">
                    <LoadingSpinner text="מייבא דיירים בעזרת AI..."/>
                </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf,text/csv" className="hidden" />

            {/* Header & Controls */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        ספר דיירים
                        <span className="text-xs bg-sky-50 text-sky-800 border border-sky-100 px-2.5 py-0.5 rounded-full font-bold">
                            {tenants.length} דיירים
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">ניהול חוזי שכירות, דמי שכירות, אנשי קשר ותקשורת WhatsApp</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={handleExportPdf} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"><ArrowDownTrayIcon className="w-4 h-4" /> PDF {isEditMode && selectedCount > 0 && `(${selectedCount})`}</button>
                        <button onClick={handleExportCsv} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"><ArrowDownTrayIcon className="w-4 h-4" /> Excel {isEditMode && selectedCount > 0 && `(${selectedCount})`}</button>
                        <button onClick={handleAiImport} className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 font-bold py-2 px-3 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors text-xs">
                            <SparklesIcon className="w-4 h-4 text-purple-600" /> יבא (AI)
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsEditMode(!isEditMode)} className={`btn-secondary text-xs py-2.5 px-3 flex items-center gap-1.5 font-bold ${isEditMode ? 'bg-sky-50 text-sky-800 border-sky-300 ring-2 ring-sky-200' : ''}`}>
                            <PencilIcon className="w-4 h-4"/> {isEditMode ? 'סיום עריכה' : 'מצב בחירה'}
                        </button>
                        <button 
                            onClick={() => openModal()}
                            className="btn-primary text-xs font-bold py-2.5 px-4 shadow-sm flex items-center gap-1.5"
                        >
                            <PlusIcon className="w-4 h-4" /> הוסף דייר
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Search and Status Filters */}
            <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/90 space-y-4">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:right-0 rtl:pl-0 rtl:pr-3.5 pointer-events-none">
                        <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                        type="search"
                        placeholder="חיפוש לפי שם, טלפון, דירה, מייל או איש קשר..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rtl:pr-10 rtl:pl-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                    />
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-bold text-slate-600 ml-1">סינון לפי חוזה:</span>
                    <button 
                        type="button" 
                        onClick={() => setLeaseFilter('all')} 
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all ${leaseFilter === 'all' ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        הכל ({tenants.length})
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setLeaseFilter('active')} 
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all ${leaseFilter === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}
                    >
                        חוזים פעילים ({tenants.filter(t => getLeaseStatus(t.leaseEndDate).type === 'active').length})
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setLeaseFilter('expiring')} 
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all ${leaseFilter === 'expiring' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}
                    >
                        מסתיים בקרוב &lt; 30 יום ({tenants.filter(t => getLeaseStatus(t.leaseEndDate).type === 'expiring').length})
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setLeaseFilter('expired')} 
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all ${leaseFilter === 'expired' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'}`}
                    >
                        פג תוקף ({tenants.filter(t => getLeaseStatus(t.leaseEndDate).type === 'expired').length})
                    </button>
                </div>
            </div>

            {filteredTenants.length === 0 ? (
                 <div className="text-center p-10 bg-white rounded-lg shadow border">
                    <p className="text-slate-500">לא נמצאו דיירים תואמים לחיפוש או לסינון.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedProjectKeys.map(projectName => {
                        const projectGroup = groupedTenants[projectName];
                        const tenantsInGroup = projectGroup.tenants;
                        const allInGroupSelected = tenantsInGroup.length > 0 && tenantsInGroup.every(t => selectedTenants[t.id]);

                        return (
                            <CollapsibleSection
                                key={projectName}
                                count={tenantsInGroup.length}
                                title={
                                     <div className="flex items-center gap-3">
                                        {isEditMode && (
                                            <input
                                                type="checkbox"
                                                className="form-checkbox h-5 w-5 rounded text-sky-600 focus:ring-sky-500"
                                                checked={allInGroupSelected}
                                                onChange={(e) => handleSelectAllForGroup(tenantsInGroup, e.target.checked)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                        )}
                                        <h3 className="text-xl font-semibold">{projectName}</h3>
                                     </div>
                                }
                            >
                                <div className="space-y-3">
                                    {tenantsInGroup.map(tenant => {
                                        const leaseStatus = getLeaseStatus(tenant.leaseEndDate);
                                        const cleanPhone = tenant.phone ? tenant.phone.replace(/[^0-9]/g, '') : '';
                                        const aptDisplay = tenant.apartmentNumber || tenant.officeNumber || '-';

                                        return (
                                         <div 
                                            key={tenant.id} 
                                            className={`bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4 transition-all duration-200 cursor-pointer ${selectedTenants[tenant.id] ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-200' : 'hover:shadow-md hover:border-sky-300'}`}
                                            onClick={() => {
                                                if (isEditMode) {
                                                    handleSelectTenant(tenant.id);
                                                } else {
                                                    setViewingTenant(tenant);
                                                }
                                            }}
                                        >
                                            {isEditMode && (
                                                <input
                                                    type="checkbox"
                                                    className="form-checkbox h-5 w-5 rounded text-sky-600 focus:ring-sky-500 flex-shrink-0"
                                                    checked={!!selectedTenants[tenant.id]}
                                                    onChange={() => handleSelectTenant(tenant.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            )}
                                            <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-bold text-slate-800 text-base">{tenant.name}</p>
                                                        <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                                                            דירה/יחידה: {aptDisplay}
                                                        </span>
                                                    </div>
                                                    {tenant.contactPerson && (
                                                        <p className="text-xs text-slate-600 mt-0.5">
                                                            <span className="font-semibold">איש קשר/נציג:</span> {tenant.contactPerson}
                                                        </p>
                                                    )}
                                                    {tenant.companyId && <p className="text-[11px] text-slate-500">ח.פ / ת.ז: {tenant.companyId}</p>}
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <a 
                                                            href={`tel:${tenant.phone}`} 
                                                            onClick={e => e.stopPropagation()}
                                                            className="flex items-center gap-1.5 text-sky-600 hover:underline"
                                                        >
                                                            <PhoneIcon className="w-3.5 h-3.5 text-slate-400"/>
                                                            {tenant.phone || '-'}
                                                        </a>
                                                        {cleanPhone && (
                                                            <a
                                                                href={`https://wa.me/${cleanPhone}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={e => e.stopPropagation()}
                                                                className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition"
                                                                title="וואטסאפ"
                                                            >
                                                                <span>WhatsApp</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                    {tenant.email && (
                                                        <p className="flex items-center gap-1.5 text-slate-600 truncate text-xs">
                                                            <EnvelopeIcon className="w-3.5 h-3.5 text-slate-400"/>
                                                            <a href={`mailto:${tenant.email}`} onClick={e => e.stopPropagation()} className="hover:underline truncate">{tenant.email}</a>
                                                        </p>
                                                    )}
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${leaseStatus.color}`}>
                                                            {leaseStatus.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-600">
                                                        <strong>סיום חוזה:</strong> {tenant.leaseEndDate || '-'}
                                                    </p>
                                                    {tenant.leaseStartDate && (
                                                        <p className="text-[11px] text-slate-500">
                                                            התחלה: {tenant.leaseStartDate}
                                                        </p>
                                                    )}
                                                </div>

                                                <div>
                                                    <p className="text-slate-700">
                                                        <strong>שכירות חודשית:</strong> {currency}{tenant.rentAmount ?? 0}
                                                    </p>
                                                    <div className="mt-1 flex items-center gap-1.5">
                                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                                            tenant.paymentStatus === 'שולם' || tenant.paymentStatus === 'paid' 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : 'bg-amber-100 text-amber-800'
                                                        }`}>
                                                            סטטוס: {tenant.paymentStatus || 'שולם'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {isEditMode && (
                                                <div className="flex-shrink-0 flex items-center gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); openModal(tenant); }} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-full"><PencilIcon className="w-4 h-4" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTenant(tenant); }} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            )}
                                        </div>
                                    )})}
                                </div>
                            </CollapsibleSection>
                        )
                    })}
                </div>
            )}

            {isEditMode && selectedCount > 0 && (
                 <div className="fixed bottom-24 inset-x-4 z-40 bg-slate-800 text-white rounded-lg shadow-lg p-4 flex justify-between items-center animate-fadeInUp">
                    <span>{selectedCount} דיירים נבחרו</span>
                    <button onClick={handleDeleteSelected} className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-md text-sm font-medium">
                        <TrashIcon className="w-5 h-5" /> מחק נבחרים
                    </button>
                </div>
            )}

            <Modal isOpen={isProjectSelectionModalOpen} onClose={() => setIsProjectSelectionModalOpen(false)} title={`יבא ${parsedTenants.length} דיירים`}>
                <div className="space-y-4">
                    <p>נמצאו {parsedTenants.length} דיירים בקובץ. לאיזה בניין תרצה לשייך אותם?</p>
                    <select
                        value={selectedProjectIdForImport}
                        onChange={e => setSelectedProjectIdForImport(e.target.value)}
                        className="input-class w-full"
                    >
                        <option value="" disabled>בחר בניין...</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setIsProjectSelectionModalOpen(false)} className="btn-secondary">ביטול</button>
                        <button onClick={handleConfirmImport} disabled={!selectedProjectIdForImport} className="btn-primary">יבא דיירים</button>
                    </div>
                </div>
            </Modal>
            
            {/* Add / Edit Tenant Modal */}
            <Modal isOpen={isTenantModalOpen} onClose={() => setIsTenantModalOpen(false)} title={editingTenant?.id ? "עריכת פרטי דייר" : "הוספת דייר חדש"} size="lg">
                {editingTenant && (
                    <div className="space-y-4">
                         {projects.length > 1 && (
                            <div>
                                <label className="label-class">בניין משויך *</label>
                                <select value={editingTenant.projectId || ''} onChange={e => setEditingTenant(prev => ({ ...prev, projectId: e.target.value }))} className="input-class w-full">
                                    <option value="" disabled>בחר בניין...</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="label-class">שם מלא *</label>
                                <input type="text" placeholder="שם הדייר" value={editingTenant.name || ''} onChange={e => setEditingTenant(prev => ({ ...prev, name: e.target.value }))} className="input-class" />
                            </div>
                            <div>
                                <label className="label-class">מספר טלפון *</label>
                                <input type="tel" placeholder="050-0000000" value={editingTenant.phone || ''} onChange={e => setEditingTenant(prev => ({ ...prev, phone: e.target.value }))} className="input-class" />
                            </div>
                            <div>
                                <label className="label-class">אימייל</label>
                                <input type="email" placeholder="email@example.com" value={editingTenant.email || ''} onChange={e => setEditingTenant(prev => ({ ...prev, email: e.target.value }))} className="input-class" />
                            </div>
                            <div>
                                <label className="label-class">ת.ז / ח.פ</label>
                                <input type="text" placeholder="מספר זיהוי / ח.פ" value={editingTenant.companyId || ''} onChange={e => setEditingTenant(prev => ({ ...prev, companyId: e.target.value }))} className="input-class" />
                            </div>
                            <div>
                                <label className="label-class">מספר דירה / יחידה</label>
                                <input type="text" placeholder="למשל: 12" value={editingTenant.apartmentNumber || editingTenant.officeNumber || ''} onChange={e => setEditingTenant(prev => ({ ...prev, apartmentNumber: e.target.value, officeNumber: e.target.value }))} className="input-class" />
                            </div>
                            <div>
                                <label className="label-class">קומה</label>
                                <input type="text" placeholder="למשל: 3" value={editingTenant.floorNumber || editingTenant.floor || ''} onChange={e => setEditingTenant(prev => ({ ...prev, floorNumber: e.target.value, floor: e.target.value }))} className="input-class" />
                            </div>
                            <div>
                                <label className="label-class">תאריך תחילת חוזה</label>
                                <input type="date" value={editingTenant.leaseStartDate || ''} onChange={e => setEditingTenant(prev => ({ ...prev, leaseStartDate: e.target.value }))} className="input-class" />
                            </div>
                            <div>
                                <label className="label-class">תאריך סיום חוזה</label>
                                <input type="date" value={editingTenant.leaseEndDate || ''} onChange={e => setEditingTenant(prev => ({ ...prev, leaseEndDate: e.target.value }))} className="input-class" />
                            </div>
                            <div>
                                <label className="label-class">שכר דירה חודשי ({currency})</label>
                                <input type="number" placeholder="5000" value={editingTenant.rentAmount || ''} onChange={e => setEditingTenant(prev => ({ ...prev, rentAmount: parseFloat(e.target.value) || 0 }))} className="input-class" />
                            </div>
                            <div>
                                <label className="label-class">סטטוס תשלום</label>
                                <select value={editingTenant.paymentStatus || 'שולם'} onChange={e => setEditingTenant(prev => ({ ...prev, paymentStatus: e.target.value as any }))} className="input-class">
                                    <option value="שולם">שולם (Paid)</option>
                                    <option value="ממתין">ממתין לתשלום (Pending)</option>
                                    <option value="באיחור">באיחור (Overdue)</option>
                                </select>
                            </div>
                            <div>
                                <label className="label-class">איש קשר / נציג (עבור חברות או משפחה)</label>
                                <input type="text" placeholder="שם איש קשר" value={editingTenant.contactPerson || ''} onChange={e => setEditingTenant(prev => ({ ...prev, contactPerson: e.target.value }))} className="input-class" />
                            </div>
                            <div>
                                <label className="label-class">איש קשר לחירום וטלפון</label>
                                <input type="text" placeholder="שם וטלפון חירום" value={editingTenant.emergencyContact || ''} onChange={e => setEditingTenant(prev => ({ ...prev, emergencyContact: e.target.value }))} className="input-class" />
                            </div>
                        </div>
                        <div>
                            <label className="label-class">הערות נוספות</label>
                            <textarea rows={2} placeholder="הערות על הדייר או החוזה..." value={editingTenant.notes || ''} onChange={e => setEditingTenant(prev => ({ ...prev, notes: e.target.value }))} className="input-class w-full" />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <button onClick={() => setIsTenantModalOpen(false)} className="btn-secondary">ביטול</button>
                            <button onClick={handleSaveTenant} className="btn-primary">שמור דייר</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Tenant Detail Dialog (MD Section 3.3) */}
            <Modal isOpen={!!viewingTenant} onClose={() => setViewingTenant(null)} title={viewingTenant ? `פרופיל דייר: ${viewingTenant.name}` : ''} size="md">
                {viewingTenant && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{viewingTenant.name}</h3>
                                <p className="text-xs text-slate-500 font-medium">{viewingTenant.projectName}</p>
                            </div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getLeaseStatus(viewingTenant.leaseEndDate).color}`}>
                                {getLeaseStatus(viewingTenant.leaseEndDate).label}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                <span className="text-slate-500 block text-[11px]">דירה / יחידה</span>
                                <span className="font-bold text-slate-800 text-base">{viewingTenant.apartmentNumber || viewingTenant.officeNumber || '-'}</span>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                <span className="text-slate-500 block text-[11px]">קומה</span>
                                <span className="font-bold text-slate-800 text-base">{viewingTenant.floorNumber || viewingTenant.floor || '-'}</span>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                <span className="text-slate-500 block text-[11px]">שכר דירה חודשי</span>
                                <span className="font-bold text-sky-700 text-base">{currency}{viewingTenant.rentAmount ?? 0}</span>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                <span className="text-slate-500 block text-[11px]">סטטוס תשלום</span>
                                <span className="font-bold text-slate-800">{viewingTenant.paymentStatus || 'שולם'}</span>
                            </div>
                        </div>

                        <div className="space-y-2 text-xs sm:text-sm border-t border-slate-200 pt-3">
                            <div className="flex justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">תקופת שכירות:</span>
                                <span className="font-semibold text-slate-800">
                                    {viewingTenant.leaseStartDate || 'לא צוין'} — {viewingTenant.leaseEndDate || 'לא צוין'}
                                </span>
                            </div>
                            {viewingTenant.contactPerson && (
                                <div className="flex justify-between py-1 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">איש קשר / נציג:</span>
                                    <span className="font-semibold text-slate-800">{viewingTenant.contactPerson}</span>
                                </div>
                            )}
                            {viewingTenant.emergencyContact && (
                                <div className="flex justify-between py-1 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">איש קשר לחירום:</span>
                                    <span className="font-semibold text-slate-800">{viewingTenant.emergencyContact}</span>
                                </div>
                            )}
                            {viewingTenant.companyId && (
                                <div className="flex justify-between py-1 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">ח.פ / ת.ז:</span>
                                    <span className="font-semibold text-slate-800">{viewingTenant.companyId}</span>
                                </div>
                            )}
                            {viewingTenant.notes && (
                                <div className="pt-2">
                                    <span className="text-slate-500 font-medium block mb-1">הערות:</span>
                                    <p className="p-2 bg-slate-50 rounded text-slate-700 text-xs">{viewingTenant.notes}</p>
                                </div>
                            )}
                        </div>

                        {/* Communication actions */}
                        <div className="pt-3 border-t border-slate-200 flex flex-wrap gap-2">
                            <a
                                href={`tel:${viewingTenant.phone}`}
                                className="flex-1 btn-primary text-xs flex items-center justify-center gap-1.5 py-2.5"
                            >
                                <PhoneIcon className="w-4 h-4" /> התקשר ({viewingTenant.phone})
                            </a>
                            {viewingTenant.phone && (
                                <a
                                    href={`https://wa.me/${viewingTenant.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 py-2.5 rounded-md transition"
                                >
                                    <span>הודעת WhatsApp</span>
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    const tenantToEdit = viewingTenant;
                                    setViewingTenant(null);
                                    openModal(tenantToEdit);
                                }}
                                className="btn-secondary text-xs px-3"
                            >
                                ערוך
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

             <style>{`
                .label-class { display: block; margin-bottom: 0.25rem; font-size: 0.875rem; font-weight: 500; color: #334155; }
                .input-class { display: block; width: 100%; border: 1px solid #cbd5e1; border-radius: 0.375rem; padding: 0.5rem 0.75rem; }
                .btn-primary { padding: 0.5rem 1rem; background-color: #0284c7; color: white; border-radius: 0.375rem; font-weight: 500; }
                .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-weight: 500; }
            `}</style>
        </div>
    );
};

export default AllTenantsPage;
