import { XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({ options, selected, onChange, placeholder = "Select...", className }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const removeOption = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== option));
  };

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[38px] px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white cursor-pointer flex flex-wrap gap-1 items-center"
      >
        {selected.length === 0 ? (
          <span className="text-gray-400">{placeholder}</span>
        ) : (
          selected.map((option) => (
            <span
              key={option}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded"
            >
              {option}
              <button type="button" onClick={(e) => removeOption(option, e)} className="hover:text-red-300">
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto bg-slate-700 border border-slate-600 rounded-lg shadow-lg">
          {options.map((option) => (
            <div
              key={option}
              onClick={() => toggleOption(option)}
              className={clsx(
                "px-3 py-2 cursor-pointer hover:bg-slate-600 text-sm",
                selected.includes(option) ? "bg-slate-600 text-blue-400" : "text-white",
              )}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
