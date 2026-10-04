import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import * as dbService from '../../services/dbService';
import { SearchResult } from '../../types';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import { MagnifyingGlassIcon } from '../icons/ActionIcons';
import { HomeIcon } from '../icons/GeneralIcons';
import { DocumentChartBarIcon, FolderIcon, QueueListIcon, ClipboardDocumentCheckIcon } from '../icons/NavigationIcons';
import { UserGroupIcon } from '../icons/UserIcons';
import { TruckIcon } from '../icons/BusinessIcons';


function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const getIconForType = (type: SearchResult['type']): ReactNode => {
    const commonClass = "w-5 h-5 text-slate-500";
    switch (type) {
        case 'project': return <HomeIcon className={commonClass} />;
        case 'report': return <DocumentChartBarIcon className={commonClass} />;
        case 'problem': return <ClipboardDocumentCheckIcon className={commonClass} />;
        case 'file': return <FolderIcon className={commonClass} />;
        case 'todo': return <QueueListIcon className={commonClass} />;
        case 'tenant': return <UserGroupIcon className={commonClass} />;
        case 'supplier': return <TruckIcon className={commonClass} />;
        default: return null;
    }
};

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const navigate = useNavigate();

  const performSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const searchResults = await dbService.globalSearch(term);
      setResults(searchResults);
    } catch (error) {
      console.error("Global search failed:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    performSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, performSearch]);
  
  const handleClose = () => {
      setSearchTerm('');
      setResults([]);
      onClose();
  };
  
  const handleResultClick = (link: string) => {
      const path = link.startsWith('/') ? link : `/${link}`;
      navigate(path.replace('#', ''));
      handleClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="חיפוש גלובלי" size="lg">
        <div className="flex flex-col h-[70vh]">
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 rtl:right-0 rtl:pl-0 rtl:pr-3">
                    <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
                </span>
                <input
                    type="search"
                    placeholder="חפש בניינים, דוחות, תקלות..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rtl:pr-10 rtl:pl-4 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                    autoFocus
                />
            </div>
            <div className="flex-grow overflow-y-auto mt-4">
                {isSearching ? (
                    <LoadingSpinner text="מחפש..." />
                ) : (
                    <div className="space-y-2">
                        {results.length > 0 ? (
                            results.map((result) => (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => handleResultClick(result.link)}
                                    className="w-full text-left rtl:text-right p-3 bg-slate-50 hover:bg-sky-100 rounded-lg transition-colors flex items-start gap-3"
                                >
                                    <div className="flex-shrink-0 mt-1">{getIconForType(result.type)}</div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-800 truncate">{result.title}</p>
                                        <p className="text-xs text-slate-500 truncate">{result.context}</p>
                                    </div>
                                </button>
                            ))
                        ) : (
                            debouncedSearchTerm.length >= 2 && (
                                <p className="text-center text-slate-500 py-8">לא נמצאו תוצאות.</p>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    </Modal>
  );
};

export default GlobalSearchModal;