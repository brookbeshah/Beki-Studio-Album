import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../context/LanguageContext';
import { Globe, Check, ChevronDown } from 'lucide-react';

interface LanguageSelectorProps {
  compact?: boolean;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ compact = false, className = '' }) => {
  const { locale, setLanguage, languages } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLang = languages.find((l) => l.code === locale) || languages[0];

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xs border border-[#E8E0D0] bg-[#FCFBF8]/90 text-xs font-medium text-[#171717] hover:border-[#C8A96B] hover:bg-white transition-all duration-200 cursor-pointer shadow-2xs"
      >
        <Globe className="w-3.5 h-3.5 text-[#C8A96B]" />
        {compact ? (
          <span className="font-semibold tracking-wider">{activeLang.shortLabel}</span>
        ) : (
          <span className="tracking-wide">{activeLang.nativeName}</span>
        )}
        <ChevronDown className="w-3 h-3 text-[#77736B] transition-transform duration-200" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 rounded-xs bg-[#FCFBF8] border border-[#E8E0D0] shadow-lg py-1.5 z-50 focus:outline-none backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-[#E8E0D0]/60 mb-1">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#A8A49C] font-semibold">
              Select Language / ቋንቋ
            </p>
          </div>
          {languages.map((lang) => {
            const isSelected = lang.code === locale;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#171717] text-[#F8F6F0] font-medium'
                    : 'text-[#171717] hover:bg-[#F8F6F0]'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-[13px]">{lang.nativeName}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-[#DCCB9A]' : 'text-[#77736B]'}`}>
                    {lang.name}
                  </span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#C8A96B] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
