import React, { useState, useEffect, useMemo } from 'react';
import { ProjectFile, ProjectTodo } from '../../types';
import { RECURRENCE_UNITS, DURATION_UNITS, MONTHS } from '../../constants';
import { calculateDueDate, formatDate } from '../../utils/dateFormatter';
import { InformationCircleIcon } from '../icons/FeedbackIcons';

interface RecurrenceEditorProps {
    type: 'file' | 'todo';
    details: Partial<ProjectFile> | Partial<ProjectTodo>;
    onUpdate: (updates: Partial<ProjectFile> | Partial<ProjectTodo>) => void;
}

const isoToInputDate = (isoString?: string) => {
    if (!isoString) return new Date().toISOString().split('T')[0];
    try {
        return new Date(isoString).toISOString().split('T')[0];
    } catch (e) {
        return new Date().toISOString().split('T')[0];
    }
};

const RecurrenceEditor: React.FC<RecurrenceEditorProps> = ({ type, details, onUpdate }) => {
    const { 
        recurrenceType = 'one-time', 
        recurrence = { unit: 'years', interval: 1, month: 1, day: 15 }, 
        duration = { unit: 'days', value: 60 },
        startDate
    } = details;
    
    const [firstExecutionDate, setFirstExecutionDate] = useState(isoToInputDate(startDate));

    // Sync recurrence rule with duration for files to simplify UI
    useEffect(() => {
        if (type === 'file' && recurrenceType === 'recurring') {
            if (duration.unit !== recurrence.unit || duration.value !== recurrence.interval) {
                onUpdate({
                    recurrence: {
                        ...recurrence,
                        unit: duration.unit,
                        interval: duration.value,
                    }
                });
            }
        }
    }, [type, recurrenceType, duration, recurrence, onUpdate]);

    useEffect(() => {
        const baseDate = new Date(firstExecutionDate);
        baseDate.setHours(12,0,0,0);
        
        let newDueDate: Date | undefined;
        if (recurrenceType === 'one-time') {
            newDueDate = baseDate;
        } else {
            newDueDate = calculateDueDate(baseDate, duration);
        }

        onUpdate({ 
            startDate: baseDate.toISOString(),
            dueDate: newDueDate?.toISOString(),
        });
    }, [firstExecutionDate, recurrenceType, duration, onUpdate]);
    
    const summaryText = useMemo(() => {
        const date = new Date(firstExecutionDate);
        date.setHours(12,0,0,0);
        const itemType = type === 'file' ? 'תוקף הקובץ' : 'המשימה';
        const startAction = type === 'file' ? 'מתחיל' : 'תתחיל';
        const durationText = `ונשארת פתוחה ל-${duration.value} ${DURATION_UNITS.find(u => u.value === duration.unit)?.label}`;

        if (recurrenceType === 'one-time') {
            return `${itemType} ${startAction} ב-${formatDate(date)}.`;
        }

        const interval = recurrence.interval;
        const unit = RECURRENCE_UNITS.find(u => u.value === recurrence.unit)?.label;
        const day = recurrence.day;
        const month = MONTHS.find(m => m.value === recurrence.month)?.label;
        
        const nextDate = calculateDueDate(date, duration);
        
        if (type === 'file') {
             return `הקובץ תקף החל מ-${formatDate(date)} למשך ${duration.value} ${unit}. הוא יפוג ב-${formatDate(nextDate)} ויתחדש אוטומטית.`;
        }

        return `${itemType} מתחדש כל ${interval} ${unit}${recurrence.unit === 'years' && month && day ? ` ב-${day} ל${month}` : ''}. ביצוע ראשון ב-${formatDate(date)}. ${durationText} ותפוגה ב-${formatDate(nextDate)}.`;
    }, [recurrenceType, recurrence, duration, firstExecutionDate, type]);

    return (
        <div className="space-y-4 p-3 bg-slate-100 rounded-lg border">
            <div className="flex items-center justify-center p-1 bg-slate-200 rounded-lg">
                {(['recurring', 'one-time'] as const).map(recType => (
                    <button
                        key={recType}
                        type="button"
                        onClick={() => onUpdate({ recurrenceType: recType as 'recurring' | 'one-time' })}
                        className={`w-full py-2 text-sm font-semibold rounded-md transition-colors ${recurrenceType === recType ? 'bg-white shadow text-sky-700' : 'text-slate-600 hover:bg-slate-300/50'}`}
                    >
                        {recType === 'recurring' ? 'מחזורי' : 'חד פעמי'}
                    </button>
                ))}
            </div>

            {recurrenceType === 'recurring' ? (
                <div className="space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {type === 'todo' && (
                            <div>
                                <label className="label-class">חוזר כל</label>
                                <div className="flex gap-2">
                                    <input type="number" min="1" value={recurrence.interval} onChange={e => onUpdate({ recurrence: {...recurrence, interval: parseInt(e.target.value) || 1} })} className="input-class w-1/2"/>
                                    <select value={recurrence.unit} onChange={e => onUpdate({ recurrence: {...recurrence, unit: e.target.value as any} })} className="input-class w-1/2">
                                        {RECURRENCE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="label-class">{type === 'file' ? 'תקף למשך' : 'נשאר פתוח ל-'}</label>
                            <div className="flex gap-2">
                                <input type="number" min="1" value={duration.value} onChange={e => onUpdate({ duration: {...duration, value: parseInt(e.target.value) || 1} })} className="input-class w-1/2"/>
                                <select value={duration.unit} onChange={e => onUpdate({ duration: {...duration, unit: e.target.value as any} })} className="input-class w-1/2">
                                    {DURATION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    {recurrence.unit === 'years' && type === 'todo' && (
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="label-class">בחודש</label>
                                <select value={recurrence.month} onChange={e => onUpdate({ recurrence: {...recurrence, month: parseInt(e.target.value)} })} className="input-class">
                                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label-class">ביום</label>
                                <input type="number" min="1" max="31" value={recurrence.day} onChange={e => onUpdate({ recurrence: {...recurrence, day: parseInt(e.target.value) || 1} })} className="input-class" />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="label-class">תאריך ביצוע ראשון</label>
                        <input 
                            type="date" 
                            value={firstExecutionDate} 
                            onChange={e => setFirstExecutionDate(e.target.value)} 
                            className="input-class" 
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-3 animate-fadeIn">
                    <div>
                        <label className="label-class">תאריך יעד</label>
                        <input 
                            type="date" 
                            value={firstExecutionDate} 
                            onChange={e => setFirstExecutionDate(e.target.value)} 
                            className="input-class" 
                        />
                    </div>
                </div>
            )}

            {summaryText && (
                <div className="flex items-start gap-2 p-2.5 bg-sky-50 text-sky-800 text-xs rounded border border-sky-200">
                    <InformationCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-sky-600" />
                    <span>{summaryText}</span>
                </div>
            )}
        </div>
    );
};

export default RecurrenceEditor;
