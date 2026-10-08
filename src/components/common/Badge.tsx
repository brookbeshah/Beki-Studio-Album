import React from 'react';
import { AlbumStatus, AlbumVisibility, UserRole } from '../../types';

export const StatusBadge: React.FC<{ status: AlbumStatus }> = ({ status }) => {
  const styles: Record<AlbumStatus, string> = {
    DRAFT: 'bg-stone-200/70 text-stone-700 border-stone-300',
    UPLOADING: 'bg-amber-100/70 text-amber-800 border-amber-300 animate-pulse',
    READY: 'bg-emerald-100/70 text-emerald-800 border-emerald-300',
    PUBLISHED: 'bg-[#C8A96B]/15 text-[#8C6D2C] border-[#C8A96B]/40 font-medium',
    ARCHIVED: 'bg-neutral-200/60 text-neutral-600 border-neutral-300',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] tracking-widest uppercase border ${styles[status]}`}
    >
      {status}
    </span>
  );
};

export const VisibilityBadge: React.FC<{ visibility: AlbumVisibility }> = ({ visibility }) => {
  const styles: Record<AlbumVisibility, string> = {
    PUBLIC: 'text-[#5B7354] bg-[#5B7354]/10 border-[#5B7354]/20',
    UNLISTED: 'text-[#8C6D2C] bg-[#C8A96B]/10 border-[#C8A96B]/30',
    PRIVATE: 'text-[#8B5E3C] bg-[#8B5E3C]/10 border-[#8B5E3C]/20',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] tracking-wider uppercase border ${styles[visibility]}`}
    >
      {visibility}
    </span>
  );
};

export const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  if (role === 'SUPER_ADMIN') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xs text-[10px] tracking-wider uppercase border font-semibold bg-[#171717] text-[#DCCB9A] border-[#C8A96B]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#C8A96B]" />
        Super Admin
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] tracking-wider uppercase border font-medium bg-[#C8A96B]/15 text-[#7A5D24] border-[#C8A96B]/30">
      Administrator
    </span>
  );
};
