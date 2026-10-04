import { RecurrenceRule, TaskDuration } from '../types';

export const formatDate = (dateString?: string | Date): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    // Use 'he-IL' locale with 2-digit day/month and numeric year for dd/mm/yyyy format.
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'תאריך לא חוקי';
  }
};

export const formatDateTime = (dateString?: string | Date): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error("Error formatting datetime:", dateString, error);
    return 'תאריך לא חוקי';
  }
};

export const getFileValidityStatus = (dueDateString?: string): { text: string; color: string; bg: string; isUrgent: boolean; isExpired: boolean; } => {
    if (!dueDateString) {
        return { text: 'אין תאריך יעד', color: 'text-slate-500', bg: 'bg-slate-100', isUrgent: false, isExpired: false };
    }
    const dueDate = new Date(dueDateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { text: `פג תוקף לפני ${Math.abs(diffDays)} ימים`, color: 'text-red-800', bg: 'bg-red-100', isUrgent: true, isExpired: true };
    }
    if (diffDays <= 30) {
        const text = diffDays > 0 ? `פג בעוד ${diffDays} ימים` : 'פג היום';
        return { text, color: 'text-amber-800', bg: 'bg-amber-100', isUrgent: true, isExpired: false };
    }

    const totalMonths = (dueDate.getFullYear() - today.getFullYear()) * 12 + (dueDate.getMonth() - today.getMonth());
    const finalYears = Math.floor(totalMonths / 12);
    const finalMonths = totalMonths % 12;

    if (finalYears > 0) {
        const yearText = finalYears === 1 ? 'שנה' : 'שנים';
        return { text: `בתוקף (יפוג בעוד כ-${finalYears} ${yearText})`, color: 'text-green-800', bg: 'bg-green-100', isUrgent: false, isExpired: false };
    } else {
        const monthText = finalMonths <= 1 ? 'חודש' : 'חודשים';
        return { text: `בתוקף (יפוג בעוד כ-${finalMonths} ${monthText})`, color: 'text-green-800', bg: 'bg-green-100', isUrgent: false, isExpired: false };
    }
};


export const calculateDueDate = (startDate: Date, duration: TaskDuration): Date => {
    const d = new Date(startDate);
    switch (duration.unit) {
        case 'days': d.setDate(d.getDate() + duration.value); break;
        case 'weeks': d.setDate(d.getDate() + duration.value * 7); break;
        case 'months': d.setMonth(d.getMonth() + duration.value); break;
        case 'years': d.setFullYear(d.getFullYear() + duration.value); break;
    }
    return d;
};

export const calculateNextStartDate = (currentStartDate: Date, rule: RecurrenceRule): Date => {
    const nextDate = new Date(currentStartDate);
    nextDate.setHours(12, 0, 0, 0); // Normalize to midday to avoid timezone issues

    switch (rule.unit) {
        case 'days':
            nextDate.setDate(nextDate.getDate() + rule.interval);
            break;
        case 'weeks':
            nextDate.setDate(nextDate.getDate() + rule.interval * 7);
            break;
        case 'months':
            nextDate.setMonth(nextDate.getMonth() + rule.interval);
            if (rule.day) {
                const originalMonth = nextDate.getMonth();
                nextDate.setDate(rule.day);
                if (nextDate.getMonth() !== originalMonth) {
                    nextDate.setDate(0); 
                }
            }
            break;
        case 'years':
            nextDate.setFullYear(nextDate.getFullYear() + rule.interval);
            if (rule.month && rule.day) {
                const originalYear = nextDate.getFullYear();
                nextDate.setMonth(rule.month - 1, rule.day);
                 if (nextDate.getFullYear() > originalYear) { // e.g., setting Feb 29 on non-leap year moved to March 1
                    // Set to last day of Feb instead
                    nextDate.setFullYear(originalYear);
                    nextDate.setMonth(rule.month, 0);
                }
            }
            break;
    }
    return nextDate;
};