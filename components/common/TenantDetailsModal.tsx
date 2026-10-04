import React from 'react';
import { TenantWithContext } from '../../types';
import Modal from './Modal';
import { formatDate } from '../../utils/dateFormatter';

interface TenantDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantWithContext | null;
}

const TenantDetailsModal: React.FC<TenantDetailsModalProps> = ({ isOpen, onClose, tenant }) => {
  if (!tenant) return null;

  const cleanPhone = (tenant.phone || '').replace(/[^0-9+]/g, '');
  const waPhone = cleanPhone.startsWith('0') ? '972' + cleanPhone.slice(1) : cleanPhone;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let leaseStatus = 'ללא תאריך סיום';
  let leaseBadgeClass = 'bg-slate-100 text-slate-700';

  if (tenant.leaseEndDate) {
    const end = new Date(tenant.leaseEndDate);
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      leaseStatus = 'חוזה פג תוקף!';
      leaseBadgeClass = 'bg-red-100 text-red-800 font-bold';
    } else if (diffDays <= 30) {
      leaseStatus = `מסתיים בעוד ${diffDays} ימים`;
      leaseBadgeClass = 'bg-amber-100 text-amber-800 font-bold';
    } else {
      leaseStatus = 'חוזה פעיל בתוקף';
      leaseBadgeClass = 'bg-green-100 text-green-800';
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`פרטי דייר: ${tenant.name}`}>
      <div className="space-y-4 text-slate-700">
        {/* Header card with name & building */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{tenant.name}</h3>
            <p className="text-sm text-slate-500">
              בניין: <strong className="text-slate-700">{tenant.projectName || tenant.building}</strong>
            </p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full ${leaseBadgeClass}`}>
            {leaseStatus}
          </span>
        </div>

        {/* Quick Contact Action Buttons (MD Section 3.3) */}
        <div className="grid grid-cols-2 gap-3">
          {tenant.phone && (
            <>
              <a
                href={`tel:${tenant.phone}`}
                className="btn-secondary py-2.5 flex items-center justify-center gap-2 font-bold text-sm bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100"
              >
                📞 חיוג טלפוני
              </a>
              <a
                href={`https://wa.me/${waPhone}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary py-2.5 flex items-center justify-center gap-2 font-bold text-sm bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              >
                💬 הודעת וואטסאפ
              </a>
            </>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-100 text-sm">
          <div>
            <span className="text-slate-400 block text-xs">דירה / יחידה:</span>
            <strong>{tenant.apartmentNumber || tenant.officeNumber || '-'}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-xs">קומה:</span>
            <strong>{tenant.floorNumber || tenant.floor || '-'}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-xs">דמי שכירות חודשיים:</span>
            <strong className="text-emerald-700 text-base">
              {tenant.rentAmount ? `₪${tenant.rentAmount.toLocaleString()}` : '-'}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block text-xs">סטטוס תשלום:</span>
            <strong className="text-slate-800">{tenant.paymentStatus || 'שולם'}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-xs">תחילת חוזה:</span>
            <span>{tenant.leaseStartDate ? formatDate(tenant.leaseStartDate) : '-'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-xs">סיום חוזה:</span>
            <span className="font-bold">{tenant.leaseEndDate ? formatDate(tenant.leaseEndDate) : '-'}</span>
          </div>
          {tenant.contactPerson && (
            <div className="col-span-2">
              <span className="text-slate-400 block text-xs">איש קשר / נציג:</span>
              <strong>{tenant.contactPerson}</strong>
            </div>
          )}
          {tenant.emergencyContact && (
            <div className="col-span-2">
              <span className="text-slate-400 block text-xs">איש קשר לשעת חירום:</span>
              <strong className="text-red-700">{tenant.emergencyContact}</strong>
            </div>
          )}
          {tenant.email && (
            <div className="col-span-2">
              <span className="text-slate-400 block text-xs">אימייל:</span>
              <a href={`mailto:${tenant.email}`} className="text-sky-600 hover:underline">{tenant.email}</a>
            </div>
          )}
          {tenant.notes && (
            <div className="col-span-2 bg-slate-50 p-2.5 rounded text-xs">
              <span className="text-slate-400 block mb-1">הערות:</span>
              {tenant.notes}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default TenantDetailsModal;
