import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Project, Tenant } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PlusIcon, PencilIcon, TrashIcon, ArrowDownTrayIcon } from '../components/icons/ActionIcons';
import Modal from '../components/common/Modal';
import { PhoneIcon, EnvelopeIcon, MapPinIcon } from '../components/icons/ContactIcons';
import { generateId } from '../utils/idGenerator';
import { exportToCsv } from '../utils/exportUtils';
import { generateTenantsPdf } from '../services/pdfService';
import { useSettings } from '../contexts/SettingsContext';

const ProjectTenantsPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();
    const { settings } = useSettings();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Partial<Tenant> | null>(null);
    const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);

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
        if (!projectId) return;
        setIsLoading(true);
        try {
            const data = await dbService.getProject(projectId);
            if (data) {
                setProject(data);
            } else {
                addToast('בניין לא נמצא', 'error');
                navigate('/');
            }
        } catch (error) {
            addToast('שגיאה בטעינת דיירים', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, addToast, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openModal = (tenant: Partial<Tenant> | null = null) => {
        setEditingTenant(tenant ? { ...tenant } : {
            name: '', phone: '', email: '', building: '', floor: '', officeNumber: '', officeSpace: '', companyId: '',
            apartmentNumber: '', floorNumber: '', leaseStartDate: '', leaseEndDate: '', rentAmount: 0, paymentStatus: 'שולם',
            contactPerson: '', emergencyContact: '', notes: ''
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!editingTenant || !editingTenant.name?.trim() || !project) {
            addToast('שם הדייר הוא שדה חובה', 'warning');
            return;
        }

        let updatedTenants: Tenant[];
        if (editingTenant.id) { // Update
            updatedTenants = (project.tenants || []).map(t => t.id === editingTenant!.id ? ({
                ...t,
                ...editingTenant,
                name: editingTenant.name!.trim(),
                rentAmount: Number(editingTenant.rentAmount) || 0
            } as Tenant) : t);
        } else { // Create
            const newTenant: Tenant = {
                id: generateId(),
                ...editingTenant,
                name: editingTenant.name.trim(),
                rentAmount: Number(editingTenant.rentAmount) || 0,
                paymentStatus: editingTenant.paymentStatus || 'שולם',
            } as Tenant;
            updatedTenants = [...(project.tenants || []), newTenant];
        }
        
        const updatedProject = { ...project, tenants: updatedTenants, updatedAt: new Date().toISOString() };

        try {
            await dbService.updateProject(updatedProject);
            addToast('הדייר נשמר', 'success');
            setIsModalOpen(false);
            setEditingTenant(null);
            fetchData();
        } catch (error) {
            addToast('שגיאה בשמירת הדייר', 'error');
        }
    };

    const handleDelete = async (tenantId: string) => {
        if (!project || !window.confirm("האם למחוק דייר זה?")) return;

        const updatedProject = {
            ...project,
            tenants: (project.tenants || []).filter(t => t.id !== tenantId),
            updatedAt: new Date().toISOString()
        };

        try {
            await dbService.updateProject(updatedProject);
            addToast('הדייר נמחק', 'success');
            fetchData();
        } catch (error) {
            addToast('שגיאה במחיקת הדייר', 'error');
        }
    };
    
    const handleExportCsv = () => {
        if (!project || !project.tenants) return;
        const dataToExport = project.tenants.map(t => ({
            'שם': t.name,
            'טלפון': t.phone,
            'מייל': t.email,
            'אגף': t.building,
            'קומה': t.floor,
            'משרד': t.officeNumber,
            'שטח': t.officeSpace,
            'ח.פ': t.companyId || '',
        }));
        exportToCsv(dataToExport, `tenants_${project.name}`);
    };

    const handleExportPdf = () => {
        if (!project || !project.tenants) return;
        generateTenantsPdf({ settings, project, tenants: project.tenants });
    };

    if (isLoading) return <LoadingSpinner text="טוען דיירים..." />;

    const tenants = project?.tenants || [];

    return (
        <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
            {/* Header & Controls */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <nav className="text-xs font-medium text-slate-400 mb-1">
                        <Link to={`/project/${projectId}`} className="text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1">
                            <span>←</span> חזרה לבניין {project?.name}
                        </Link>
                    </nav>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">דיירים: {project?.name} ({tenants.length})</h2>
                    <p className="text-sm text-slate-500 mt-1">ניהול חוזי שכירות, תשלומים ופרטי התקשרות</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handleExportPdf} className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-2 border border-slate-200/80 shadow-2xs">
                        <ArrowDownTrayIcon className="w-4 h-4"/>יצא PDF
                    </button>
                    <button onClick={handleExportCsv} className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-2 border border-slate-200/80 shadow-2xs">
                        <ArrowDownTrayIcon className="w-4 h-4"/>יצא Excel
                    </button>
                    <button onClick={() => openModal()} className="px-4 py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition flex items-center gap-1.5">
                        <PlusIcon className="w-4 h-4"/>הוסף דייר
                    </button>
                </div>
            </div>

            {tenants.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-slate-200/90">
                    <p className="text-slate-500 text-sm">לא נמצאו דיירים בבניין זה.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tenants.map(tenant => {
                        const leaseStatus = getLeaseStatus(tenant.leaseEndDate);
                        const cleanPhone = tenant.phone ? tenant.phone.replace(/[^0-9]/g, '') : '';
                        const aptDisplay = tenant.apartmentNumber || tenant.officeNumber || '-';

                        return (
                            <div 
                                key={tenant.id} 
                                onClick={() => setViewingTenant(tenant)}
                                className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:border-sky-300 cursor-pointer"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900">{tenant.name}</h3>
                                            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-lg mt-1 inline-block">
                                                דירה/יחידה: {aptDisplay} {tenant.floorNumber ? `(קומה ${tenant.floorNumber})` : ''}
                                            </span>
                                        </div>
                                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${leaseStatus.color}`}>
                                            {leaseStatus.label}
                                        </span>
                                    </div>

                                    {tenant.contactPerson && (
                                        <p className="text-xs text-slate-600 mt-2">
                                            <span className="font-semibold">נציג / איש קשר:</span> {tenant.contactPerson}
                                        </p>
                                    )}

                                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <PhoneIcon className="w-3.5 h-3.5 text-slate-400"/> 
                                            <a href={`tel:${tenant.phone}`} onClick={e => e.stopPropagation()} className="hover:underline text-sky-600 font-medium">{tenant.phone}</a>
                                            {cleanPhone && (
                                                <a
                                                    href={`https://wa.me/${cleanPhone}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={e => e.stopPropagation()}
                                                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200"
                                                >
                                                    WhatsApp
                                                </a>
                                            )}
                                        </div>
                                        {tenant.email && (
                                            <p className="flex items-center gap-2 truncate">
                                                <EnvelopeIcon className="w-3.5 h-3.5 text-slate-400"/> 
                                                <a href={`mailto:${tenant.email}`} onClick={e => e.stopPropagation()} className="hover:underline truncate">{tenant.email}</a>
                                            </p>
                                        )}
                                        <p className="text-slate-700 pt-2 border-t border-slate-100">
                                            <strong>שכירות:</strong> {currency}{tenant.rentAmount ?? 0} • <strong>סיום:</strong> {tenant.leaseEndDate || '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-1">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); openModal(tenant); }} 
                                        className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors" 
                                        title="ערוך פרטי דייר"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(tenant.id); }} 
                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" 
                                        title="מחק דייר"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add / Edit Tenant Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTenant?.id ? "עריכת פרטי דייר" : "הוספת דייר חדש"} size="lg">
                {editingTenant && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">שם הדייר *</label>
                                <input type="text" placeholder="שם מלא" value={editingTenant.name || ''} onChange={e => setEditingTenant(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">טלפון *</label>
                                <input type="tel" placeholder="050-0000000" value={editingTenant.phone || ''} onChange={e => setEditingTenant(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">אימייל</label>
                                <input type="email" placeholder="email@example.com" value={editingTenant.email || ''} onChange={e => setEditingTenant(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">מספר דירה / יחידה</label>
                                <input type="text" placeholder="למשל: 4" value={editingTenant.apartmentNumber || editingTenant.officeNumber || ''} onChange={e => setEditingTenant(prev => ({ ...prev, apartmentNumber: e.target.value, officeNumber: e.target.value }))} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">קומה</label>
                                <input type="text" placeholder="למשל: 2" value={editingTenant.floorNumber || editingTenant.floor || ''} onChange={e => setEditingTenant(prev => ({ ...prev, floorNumber: e.target.value, floor: e.target.value }))} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ח.פ / ת.ז</label>
                                <input type="text" placeholder="מספר זיהוי" value={editingTenant.companyId || ''} onChange={e => setEditingTenant(prev => ({ ...prev, companyId: e.target.value }))} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">תאריך תחילת חוזה</label>
                                <input type="date" value={editingTenant.leaseStartDate || ''} onChange={e => setEditingTenant(prev => ({ ...prev, leaseStartDate: e.target.value }))} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">תאריך סיום חוזה</label>
                                <input type="date" value={editingTenant.leaseEndDate || ''} onChange={e => setEditingTenant(prev => ({ ...prev, leaseEndDate: e.target.value }))} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">שכר דירה חודשי ({currency})</label>
                                <input type="number" placeholder="5000" value={editingTenant.rentAmount || ''} onChange={e => setEditingTenant(prev => ({ ...prev, rentAmount: parseFloat(e.target.value) || 0 }))} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">סטטוס תשלום</label>
                                <select value={editingTenant.paymentStatus || 'שולם'} onChange={e => setEditingTenant(prev => ({ ...prev, paymentStatus: e.target.value as any }))} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition">
                                    <option value="שולם">שולם (Paid)</option>
                                    <option value="ממתין">ממתין לתשלום (Pending)</option>
                                    <option value="באיחור">באיחור (Overdue)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">נציג / איש קשר</label>
                                <input type="text" placeholder="שם איש קשר" value={editingTenant.contactPerson || ''} onChange={e => setEditingTenant(prev => ({ ...prev, contactPerson: e.target.value }))} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">איש קשר לחירום וטלפון</label>
                                <input type="text" placeholder="שם וטלפון חירום" value={editingTenant.emergencyContact || ''} onChange={e => setEditingTenant(prev => ({ ...prev, emergencyContact: e.target.value }))} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">הערות</label>
                            <textarea rows={2} placeholder="הערות..." value={editingTenant.notes || ''} onChange={e => setEditingTenant(prev => ({ ...prev, notes: e.target.value }))} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition">ביטול</button>
                            <button onClick={handleSave} className="px-5 py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white transition shadow-xs">שמור דייר</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Tenant Detail Dialog */}
            <Modal isOpen={!!viewingTenant} onClose={() => setViewingTenant(null)} title={viewingTenant ? `פרופיל דייר: ${viewingTenant.name}` : ''} size="md">
                {viewingTenant && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{viewingTenant.name}</h3>
                                <p className="text-xs text-slate-500 font-medium">דירה/יחידה: {viewingTenant.apartmentNumber || viewingTenant.officeNumber || '-'}</p>
                            </div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getLeaseStatus(viewingTenant.leaseEndDate).color}`}>
                                {getLeaseStatus(viewingTenant.leaseEndDate).label}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                            <div className="p-3 bg-white border border-slate-200 rounded-xl">
                                <span className="text-slate-500 block text-[11px]">שכר דירה חודשי</span>
                                <span className="font-bold text-sky-700 text-base">{currency}{viewingTenant.rentAmount ?? 0}</span>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-xl">
                                <span className="text-slate-500 block text-[11px]">סטטוס תשלום</span>
                                <span className="font-bold text-slate-800">{viewingTenant.paymentStatus || 'שולם'}</span>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-xl">
                                <span className="text-slate-500 block text-[11px]">תחילת חוזה</span>
                                <span className="font-semibold text-slate-800">{viewingTenant.leaseStartDate || '-'}</span>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-xl">
                                <span className="text-slate-500 block text-[11px]">סיום חוזה</span>
                                <span className="font-semibold text-slate-800">{viewingTenant.leaseEndDate || '-'}</span>
                            </div>
                        </div>

                        {viewingTenant.contactPerson && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <strong>איש קשר / נציג:</strong> {viewingTenant.contactPerson}
                            </p>
                        )}
                        {viewingTenant.emergencyContact && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <strong>איש קשר לחירום:</strong> {viewingTenant.emergencyContact}
                            </p>
                        )}
                        {viewingTenant.notes && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <strong>הערות:</strong> {viewingTenant.notes}
                            </p>
                        )}

                        <div className="pt-3 border-t border-slate-200 flex flex-wrap gap-2">
                            <a
                                href={`tel:${viewingTenant.phone}`}
                                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center gap-1.5 transition shadow-xs"
                            >
                                <PhoneIcon className="w-4 h-4" /> התקשר ({viewingTenant.phone})
                            </a>
                            {viewingTenant.phone && (
                                <a
                                    href={`https://wa.me/${viewingTenant.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition shadow-xs"
                                >
                                    <span>WhatsApp</span>
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ProjectTenantsPage;