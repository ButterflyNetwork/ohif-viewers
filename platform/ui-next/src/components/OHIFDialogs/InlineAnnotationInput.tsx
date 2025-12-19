import React, { useState, useRef, useEffect } from 'react';
import { CheckIcon, Cross2Icon } from '@radix-ui/react-icons';
import { cn } from '../../lib/utils';

interface InlineAnnotationInputProps {
  onSave: (value: string) => void;
  onCancel: () => void;
  defaultValue?: string;
  placeholder?: string;
  submitOnEnter?: boolean;
  className?: string;
  hide?: () => void;
}

export function InlineAnnotationInput({
  onSave,
  onCancel,
  defaultValue = '',
  placeholder = 'Enter annotation text',
  submitOnEnter = true,
  className,
  hide,
}: InlineAnnotationInputProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (defaultValue) {
        inputRef.current.select();
      }
    }
  }, [defaultValue]);

  const handleSave = () => {
    onSave(value);
    hide?.();
  };

  const handleCancel = () => {
    onCancel();
    hide?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (submitOnEnter && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // TODO Try to use our components library

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-[rgba(51,51,51,1)] bg-[rgba(26,26,26,1)] py-1.5 px-2',
        className
      )}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-w-[200px] flex-1 rounded-md border border-[rgba(51,51,51,1)] bg-[rgba(51,51,51,1)] px-3 py-2 text-sm text-white placeholder-[rgba(128,128,128,1)] outline-none focus:border-[rgba(39,121,255,1)] focus:ring-1 focus:ring-[rgba(39,121,255,1)]"
      />
      <button
        type="button"
        onClick={handleSave}
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(39,121,255,1)] text-white transition-colors hover:bg-[rgba(39,121,255,0.8)] active:bg-[rgba(39,121,255,0.9)]"
        aria-label="Confirm annotation"
      >
        <CheckIcon className="h-7 w-7" />
      </button>
      <button
        type="button"
        onClick={handleCancel}
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-transparent text-gray-400 transition-colors hover:text-white"
        aria-label="Cancel annotation"
      >
        <Cross2Icon className="h-7 w-7" />
      </button>
    </div>
  );
}

export default InlineAnnotationInput;
