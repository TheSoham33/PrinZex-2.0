'use client';

import { IconGoogle } from '@/components/icons';

interface SocialLoginButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

export default function SocialLoginButton({
  onClick,
  disabled = false,
  label = 'Continue with Google',
}: SocialLoginButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="btn-secondary w-full">
      <IconGoogle className="h-5 w-5" />
      {label}
    </button>
  );
}
