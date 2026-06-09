import { useRef } from 'react';
import { formatKorean, addDays, today } from '../lib/dateUtils.js';

export default function DateSelector({ date, onChange }) {
  const inputRef = useRef(null);
  const isToday = date === today();

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(addDays(date, -1))}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors text-lg font-light"
        title="이전 날"
      >
        ‹
      </button>
      <button
        onClick={() => inputRef.current?.showPicker?.() ?? inputRef.current?.click()}
        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors min-w-[196px] text-center"
      >
        {formatKorean(date)}
      </button>
      <input
        ref={inputRef}
        type="date"
        value={date}
        onChange={e => e.target.value && onChange(e.target.value)}
        className="sr-only"
      />
      <button
        onClick={() => onChange(addDays(date, 1))}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors text-lg font-light"
        title="다음 날"
      >
        ›
      </button>
      {!isToday && (
        <button
          onClick={() => onChange(today())}
          className="ml-1 px-2.5 py-1 rounded-lg text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium transition-colors"
        >
          오늘
        </button>
      )}
    </div>
  );
}
