import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { ArrowUpTrayIcon } from '../icons/ActionIcons';

export interface FormFieldOption {
  label: string;
  value: any;
}

export interface FormFieldConfig<T> {
  name: keyof T & string;
  label: string;
  type: 'text' | 'number' | 'email' | 'tel' | 'date' | 'textarea' | 'select' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number | string;
  options?: FormFieldOption[];
  span?: 1 | 2; // 1 = 1 column, 2 = 2 columns span in grid
  helperText?: string;
}

export interface FormModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: T, attachment?: File | null) => Promise<void> | void;
  title: string;
  initialData?: Partial<T>;
  fields: FormFieldConfig<T>[];
  allowAttachments?: boolean;
  attachmentLabel?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  submitText?: string;
  isSubmitting?: boolean;
}

/**
 * Configuration-Driven Generic Modal (FormModal<T>)
 * Reusable, type-safe modal driven by an array of field specifications.
 * Fits Tailwind v4 design tokens: rounded-2xl cards, rounded-xl inputs/buttons, font-mono numbers.
 */
export function FormModal<T extends Record<string, any>>({
  isOpen,
  onClose,
  onSubmit,
  title,
  initialData = {},
  fields,
  allowAttachments = false,
  attachmentLabel = 'צרף קובץ או תמונה',
  size = 'md',
  submitText = 'שמור',
  isSubmitting = false,
}: FormModalProps<T>) {
  const [formData, setFormData] = useState<Partial<T>>(initialData);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [localSubmitting, setLocalSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
      setAttachment(null);
      setAttachmentPreview(null);
      setLocalSubmitting(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setAttachmentPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setAttachmentPreview(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalSubmitting(true);
    try {
      await onSubmit(formData as T, attachment);
      onClose();
    } catch (err) {
      console.error('FormModal submit error:', err);
    } finally {
      setLocalSubmitting(false);
    }
  };

  const activeSubmitting = isSubmitting || localSubmitting;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((field) => {
            const spanClass = field.span === 2 ? 'sm:col-span-2' : 'sm:col-span-1';
            const value = formData[field.name as keyof T] ?? '';

            if (field.type === 'checkbox') {
              return (
                <div key={field.name} className={`${spanClass} flex items-center gap-3 pt-2`}>
                  <input
                    type="checkbox"
                    id={`field-${field.name}`}
                    checked={Boolean(value)}
                    onChange={(e) => handleChange(field.name, e.target.checked)}
                    className="w-4 h-4 rounded-md border-neutral-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label
                    htmlFor={`field-${field.name}`}
                    className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer"
                  >
                    {field.label}
                    {field.required && <span className="text-rose-500 mr-1">*</span>}
                  </label>
                </div>
              );
            }

            if (field.type === 'textarea') {
              return (
                <div key={field.name} className={`${spanClass} space-y-1.5`}>
                  <label
                    htmlFor={`field-${field.name}`}
                    className="block text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200"
                  >
                    {field.label}
                    {field.required && <span className="text-rose-500 mr-1">*</span>}
                  </label>
                  <textarea
                    id={`field-${field.name}`}
                    rows={3}
                    value={value}
                    placeholder={field.placeholder}
                    required={field.required}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm shadow-2xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                  />
                  {field.helperText && (
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{field.helperText}</p>
                  )}
                </div>
              );
            }

            if (field.type === 'select') {
              return (
                <div key={field.name} className={`${spanClass} space-y-1.5`}>
                  <label
                    htmlFor={`field-${field.name}`}
                    className="block text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200"
                  >
                    {field.label}
                    {field.required && <span className="text-rose-500 mr-1">*</span>}
                  </label>
                  <select
                    id={`field-${field.name}`}
                    value={value}
                    required={field.required}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm shadow-2xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                  >
                    <option value="">{field.placeholder || 'בחר...'}</option>
                    {field.options?.map((opt) => (
                      <option key={String(opt.value)} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {field.helperText && (
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{field.helperText}</p>
                  )}
                </div>
              );
            }

            const isNumber = field.type === 'number';

            return (
              <div key={field.name} className={`${spanClass} space-y-1.5`}>
                <label
                  htmlFor={`field-${field.name}`}
                  className="block text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200"
                >
                  {field.label}
                  {field.required && <span className="text-rose-500 mr-1">*</span>}
                </label>
                <input
                  type={field.type}
                  id={`field-${field.name}`}
                  value={value}
                  placeholder={field.placeholder}
                  required={field.required}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  onChange={(e) =>
                    handleChange(
                      field.name,
                      isNumber ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value
                    )
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm shadow-2xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition ${
                    isNumber || field.type === 'date' ? 'font-mono' : ''
                  }`}
                />
                {field.helperText && (
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{field.helperText}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Attachment Upload Option */}
        {allowAttachments && (
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <label className="block text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
              {attachmentLabel}
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 text-xs font-semibold text-neutral-700 dark:text-neutral-200 transition shadow-2xs active:scale-95">
                <ArrowUpTrayIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>בחר קובץ להעלאה</span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,application/pdf"
                />
              </label>
              {attachment && (
                <span className="text-xs text-neutral-600 dark:text-neutral-300 truncate max-w-xs font-mono">
                  {attachment.name}
                </span>
              )}
            </div>
            {attachmentPreview && (
              <div className="mt-2 w-24 h-24 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
                <img src={attachmentPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300 transition shadow-2xs"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={activeSubmitting}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition active:scale-95 disabled:opacity-50"
          >
            {activeSubmitting ? 'שומר...' : submitText}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default FormModal;
