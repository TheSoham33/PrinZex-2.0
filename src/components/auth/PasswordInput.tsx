'use client';

import { useState } from 'react';
import { IconEye, IconEyeOff } from '@/components/icons';

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  hasError?: boolean;
}

export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete = 'current-password',
  hasError = false,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`input pr-11 ${hasError ? 'input-error' : ''}`}
      />
      <button
        type="button"
        onClick={() => setVisible((previous) => !previous)}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition-colors hover:text-slate-600"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <IconEyeOff className="h-5 w-5" /> : <IconEye className="h-5 w-5" />}
      </button>
    </div>
  );
}
