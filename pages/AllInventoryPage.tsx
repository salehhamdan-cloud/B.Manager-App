import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { InventoryItemWithContext } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PLACEHOLDER_IMAGE_URL_PROBLEM } from '../constants';
import { ArrowDownTrayIcon } from '../components/icons/ActionIcons';
import { useSettings } from '../contexts/SettingsContext';
import { generateAllInventoryPdf } from '../services/pdfService';
import { exportToCsv } from '../utils/exportUtils';
import { formatDate } from '../utils/dateFormatter';
import NavigationCard from '../components/common/NavigationCard';
import { ClipboardDocumentListIcon } from '../components/icons/NavigationIcons';

const AllInventoryPage: React.FC = () => {
    const { addToast } = useToast();
    const { settings } = useSettings();

    const [items, setItems] = useState<InventoryItemWithContext[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const projects = await dbService.getAllProjects();
            const allItems: InventoryItemWithContext[] = [];
            (projects || []).forEach(project => {
                (project.inventory || []).forEach(location => {
                    (location.itemGroups || []).forEach(group => {
                        (group.items || []).forEach(item => {
                            allItems.push({
                                ...item,
                                buildingId: project.id,
                                buildingName: project.name,
                                locationId: location.id,
                                locationName: location.name,
                                groupId: group.id,
                                groupName: group.name,
                            });
                        });
                    });
                });
            });
            setItems(allItems);
        } catch (error) {
            addToast('שגיאה בטעינת פריטי המלאי', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredItems = useMemo(() => {
        if (!searchTerm) {
            return items.sort((a, b) => a.name.localeCompare(b.name, 'he'));
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return items
            .filter(item =>
                item.name.toLowerCase().includes(lowercasedTerm) ||
                item.description.toLowerCase().includes(lowercasedTerm) ||
                item.model.toLowerCase().includes(lowercasedTerm) ||
                item.company.toLowerCase().includes(lowercasedTerm) ||
                item.locationName.toLowerCase().includes(lowercasedTerm) ||
                item.groupName.toLowerCase().includes(lowercasedTerm) ||
                item.buildingName.toLowerCase().includes(lowercasedTerm)
            )
            .sort((a, b) => a.name.localeCompare(b.name, 'he'));
    }, [items, searchTerm]);
    
    const handleExportPdf = () => {
        if (filteredItems.length === 0) {
            addToast('אין פריטים לייצוא', 'warning');
            return;
        }
        addToast('מכין PDF...', 'info');
        generateAllInventoryPdf({ settings, items: filteredItems });
    };

    const handleExportCsv = () => {
        if (filteredItems.length === 0) {
            addToast('אין פריטים לייצוא', 'warning');
            return;
        }
        const dataToExport = filteredItems.map(item => ({
            'בניין': item.buildingName,
            'מיקום': item.locationName,
            'קבוצה': item.groupName,
            'שם פריט': item.name,
            'חברה': item.company,
            'דגם': item.model,
            'כמות': item.quantity,
            'תאריך סיום אחריות': item.warrantyEndDate ? formatDate(item.warrantyEndDate) : '-',
            'מידע אחריות': item.warrantyInfo || '',
        }));
        exportToCsv(dataToExport, 'all_inventory_list');
        addToast('קובץ Excel יוצא...', 'success');
    };

    if (isLoading) return <LoadingSpinner text="טוען את כל פריטי המלאי..." />;

    return (
        <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
            {/* Header & Controls */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">קטלוג ומלאי ציוד כולל</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">סקירה חוצת-בניינים של כל הפריטים, החלפים והמערכות הרשומות במערכת</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleExportPdf} className="btn-secondary text-xs sm:text-sm flex items-center gap-1.5">
                        <ArrowDownTrayIcon className="w-4 h-4"/>
                        <span>ייצוא PDF</span>
                    </button>
                    <button onClick={handleExportCsv} className="btn-secondary text-xs sm:text-sm flex items-center gap-1.5">
                        <ArrowDownTrayIcon className="w-4 h-4"/>
                        <span>ייצוא Excel</span>
                    </button>
                </div>
            </div>
            
            <NavigationCard
                to="/order-list"
                icon={<ClipboardDocumentListIcon className="w-6 h-6 text-sky-700" />}
                title="פריטים ברשימת הזמנה ורכש"
                count={settings.inventoryOrderList?.length || 0}
            />

            {/* Search Bar */}
            <div className="sticky top-20 bg-slate-50/80 backdrop-blur-md z-10 py-2">
                <input
                    type="search"
                    placeholder={`חיפוש לפי שם פריט, דגם, יצרן, קבוצה, מיקום או בניין (${items.length} פריטים)...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200/90 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-2xs transition-all"
                />
            </div>

            {filteredItems.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-8">
                    <p className="text-slate-500 text-base font-medium">{searchTerm ? 'לא נמצאו פריטי מלאי תואמים לחיפוש.' : 'לא קיימים פריטים במלאי.'}</p>
                    <p className="text-xs text-slate-400 mt-1">הזן פריטים דרך כרטיסיית המלאי של כל בניין.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredItems.map(item => (
                        <Link
                            key={item.id}
                            to={`/project/${item.buildingId}/inventory/location/${item.locationId}/group/${item.groupId}`}
                            className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden group flex flex-col transition-all duration-200 hover:shadow-md hover:border-sky-300"
                            title={`${item.buildingName} > ${item.locationName} > ${item.groupName}`}
                        >
                            <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                                <img
                                    src={item.images.length > 0 ? (item.images[0].url || item.images[0].dataUrl) : PLACEHOLDER_IMAGE_URL_PROBLEM}
                                    alt={item.name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute top-2 left-2 bg-slate-900/85 backdrop-blur-xs text-white text-[11px] font-bold rounded-lg px-2 py-0.5 shadow-sm font-mono-numbers">
                                    x{item.quantity}
                                </div>
                            </div>
                            <div className="p-3.5 flex-grow flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm leading-snug truncate tracking-tight group-hover:text-sky-700 transition-colors">
                                        {item.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1 truncate font-medium">{item.buildingName}</p>
                                </div>
                                <div className="pt-2 mt-2 border-t border-slate-100 text-[11px] text-slate-400 truncate">
                                    {item.locationName} &bull; {item.groupName}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AllInventoryPage;
