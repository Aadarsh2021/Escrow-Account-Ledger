import { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomDatePickerProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  align?: 'top' | 'bottom';
}

export const CustomDatePicker = ({ 
  label, 
  value, 
  onChange,
  align = 'bottom'
}: CustomDatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Parse initial value (YYYY-MM-DD)
  const initialDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Select Date';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleDateClick = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const days = [];
  // Empty slots for previous month's trailing days
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
  }
  
  // Current month's days
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const dateStr = `${viewYear}-${mm}-${dd}`;
    const isSelected = value === dateStr;
    const isToday = new Date().toDateString() === new Date(viewYear, viewMonth, d).toDateString();

    days.push(
      <button
        key={`day-${d}`}
        type="button"
        onClick={() => handleDateClick(d)}
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
          isSelected 
            ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
            : isToday 
              ? 'border border-blue-600 text-blue-600 dark:text-blue-400' 
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        {d}
      </button>
    );
  }

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const YEARS = Array.from({ length: 21 }, (_, i) => 2015 + i); // 2015 to 2035

  return (
    <div className="relative w-full text-left" ref={dropdownRef}>
      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl outline-none focus:border-blue-600 font-bold cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all"
      >
        <span>{formatDateDisplay(value)}</span>
        <Calendar className="w-4 h-4 text-slate-400" />
      </div>

      {isOpen && (
        <div className={`absolute left-0 right-0 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-[160] animate-in fade-in duration-200 ${
          align === 'top' 
            ? 'bottom-full mb-2 slide-in-from-bottom-2' 
            : 'top-full mt-2 slide-in-from-top-2'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4 gap-2">
            <button 
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex gap-1.5 flex-1">
              <select 
                value={viewMonth} 
                onChange={(e) => setViewMonth(parseInt(e.target.value))}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1 px-1.5 text-xs font-black text-slate-800 dark:text-slate-200 outline-none"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>{name}</option>
                ))}
              </select>

              <select 
                value={viewYear} 
                onChange={(e) => setViewYear(parseInt(e.target.value))}
                className="w-20 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1 px-1.5 text-xs font-black text-slate-800 dark:text-slate-200 outline-none"
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button 
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => (
              <span key={w} className="text-[10px] font-bold text-slate-400">{w}</span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 justify-items-center">
            {days}
          </div>
        </div>
      )}
    </div>
  );
};
