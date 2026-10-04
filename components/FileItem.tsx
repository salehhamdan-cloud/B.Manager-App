import React, { useState } from 'react';
import { ProjectFile, HistoricalFile } from '../types';
import { getFileValidityStatus, formatDate } from '../utils/dateFormatter';
import { EyeIcon, ArrowDownTrayIcon, TrashIcon, PencilIcon, ChevronDownIcon, ChevronUpIcon } from './icons/ActionIcons';
import { SettingsIcon, FolderIcon } from './icons/GeneralIcons';
import { isMimeTypeViewable } from '../utils/fileUtils';
import Modal from './common/Modal';

// A local, reusable viewer modal that can handle both current and historical files.
const FileViewerModal: React.FC<{ file: ProjectFile | HistoricalFile | null; onClose: () => void }> = ({ file, onClose }) => {
    if (!file) return null;
    const fileSrc = file.url || ('dataUrl' in file ? file.dataUrl : undefined);
    return (
        <Modal isOpen={!!file} onClose={onClose} title={`תצוגה מקדימה: ${file.name}`} size="xl">
            <div className="w-full h-[75vh] bg-slate-200 rounded-md">
                {fileSrc && file.mimeType.startsWith('image/') ? (
                    <img src={fileSrc} alt={file.name} className="w-full h-full object-contain" />
                ) : fileSrc && file.mimeType === 'application/pdf' ? (
                    <iframe src={fileSrc} title={file.name} className="w-full h-full border-0" />
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-600">
                        <p>לא ניתן להציג תצוגה מקדימה עבור קובץ מסוג זה.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};


interface FileItemProps {
  file: ProjectFile;
  onView?: () => void;
  onDelete: () => void;
  onEdit?: () => void;
  onAnnotate?: () => void;
  onRenew?: (file: ProjectFile) => void;
  onDeleteHistory?: (fileId: string, historyId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

const FileItem: React.FC<FileItemProps> = ({ file, onView, onDelete, onEdit, onAnnotate, onRenew, onDeleteHistory, className, style }) => {
    const [showHistory, setShowHistory] = useState(false);
    const [viewingHistoryFile, setViewingHistoryFile] = useState<HistoricalFile | null>(null);
    const status = getFileValidityStatus(file.dueDate);

    const HistoryItem: React.FC<{ item: HistoricalFile }> = ({ item }) => (
        <div className="p-2 bg-slate-100 rounded-md text-xs">
            <div className="flex justify-between items-center">
                <div>
                    <p><strong>תאריך העלאה:</strong> {formatDate(item.uploadedAt)}</p>
                    <p><strong>תוקף עד:</strong> {item.dueDate ? formatDate(item.dueDate) : 'N/A'}</p>
                </div>
                <div className="flex items-center">
                    {isMimeTypeViewable(item.mimeType) && (
                        <button onClick={() => setViewingHistoryFile(item)} className="p-2 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-200" title="צפה בקובץ" aria-label="צפה בקובץ היסטורי">
                            <EyeIcon className="w-4 h-4"/>
                        </button>
                    )}
                    {item.url && (
                        <a href={item.url} download={item.name} className="p-2 text-sky-600 hover:bg-sky-100 rounded-full" title="הורד גרסה ישנה" aria-label="הורד גרסה ישנה של הקובץ">
                            <ArrowDownTrayIcon className="w-4 h-4"/>
                        </a>
                    )}
                    {onDeleteHistory && (
                        <button onClick={() => onDeleteHistory(file.id, item.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full" title="מחק גרסה" aria-label="מחק גרסה היסטורית">
                            <TrashIcon className="w-4 h-4"/>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div className={`bg-white shadow-2xs rounded-2xl p-4 border border-slate-200/90 transition-all duration-200 hover:shadow-md hover:border-slate-300 group ${className || ''}`} style={style}>
                <div className="flex justify-between items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-sky-50 text-slate-500 group-hover:text-sky-700 flex items-center justify-center flex-shrink-0 transition-colors border border-slate-200/60">
                        <FolderIcon className="w-5 h-5" />
                    </div>

                    <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-bold text-sm sm:text-base text-slate-900 truncate tracking-tight group-hover:text-sky-700 transition-colors" title={file.name}>
                                {file.name}
                            </p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md border ${status.bg} ${status.color} border-current/20`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                {status.text}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                            {file.group && (
                                <span className="font-semibold text-slate-700">
                                    {file.group}
                                </span>
                            )}
                            {file.dueDate && (
                                <>
                                    {file.group && <span>&bull;</span>}
                                    <span className="font-mono-numbers">תוקף: {formatDate(file.dueDate)}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center flex-shrink-0 gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        {onView && (
                            <button onClick={onView} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors" title="צפה בקובץ" aria-label="צפה בקובץ">
                                <EyeIcon className="w-4 h-4"/>
                            </button>
                        )}
                        <a href={file.url || file.dataUrl} download={file.name} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors" title="הורד קובץ" aria-label="הורד קובץ">
                            <ArrowDownTrayIcon className="w-4 h-4"/>
                        </a>
                        {file.mimeType.startsWith('image/') && onAnnotate && (
                            <button onClick={onAnnotate} className="p-1.5 text-slate-400 hover:text-sky-700 rounded-lg hover:bg-sky-50 transition-colors" title="ערוך תמונה" aria-label="ערוך תמונה">
                                <PencilIcon className="w-4 h-4"/>
                            </button>
                        )}
                        {onEdit && (
                            <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-sky-700 rounded-lg hover:bg-sky-50 transition-colors" title="ערוך פרטים" aria-label="ערוך פרטי קובץ">
                                <SettingsIcon className="w-4 h-4"/>
                            </button>
                        )}
                        <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors" title="מחק קובץ" aria-label="מחק קובץ">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                    <div>
                        {file.history && file.history.length > 0 && (
                            <button onClick={() => setShowHistory(!showHistory)} className="text-xs flex items-center gap-1 text-slate-500 hover:text-sky-700 font-semibold transition-colors" aria-expanded={showHistory}>
                                <span>{showHistory ? 'הסתר היסטוריה' : `גרסאות קודמות (${file.history.length})`}</span>
                                {showHistory ? <ChevronUpIcon className="w-3.5 h-3.5"/> : <ChevronDownIcon className="w-3.5 h-3.5"/>}
                            </button>
                        )}
                    </div>
                    {onRenew && (
                        <button 
                            onClick={() => onRenew(file)} 
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-2xs ${
                                status.isExpired 
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                                    : 'bg-sky-600 hover:bg-sky-700 text-white'
                            }`}
                        >
                            חדש קובץ
                        </button>
                    )}
                </div>

                {showHistory && file.history && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-slate-100">
                        {file.history.map(item => <HistoryItem key={item.id} item={item} />)}
                    </div>
                )}
            </div>
            <FileViewerModal file={viewingHistoryFile} onClose={() => setViewingHistoryFile(null)} />
        </>
    );
};

export default FileItem;