import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'gold' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium transition-all duration-200 select-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#C8A96B] disabled:opacity-50 disabled:cursor-not-allowed';

  const sizes = {
    sm: 'text-xs px-3 py-1.5 rounded-sm tracking-wider uppercase',
    md: 'text-sm px-4 py-2 rounded-sm tracking-wider uppercase',
    lg: 'text-base px-6 py-3 rounded-sm tracking-wider uppercase',
  };

  const variants = {
    primary:
      'bg-[#171717] text-[#F8F6F0] hover:bg-[#2A2826] border border-[#171717] active:scale-[0.99] shadow-sm',
    gold:
      'bg-gradient-to-r from-[#DCCB9A] via-[#C8A96B] to-[#B39356] text-[#171717] hover:brightness-105 active:scale-[0.99] shadow-sm font-semibold',
    outline:
      'bg-transparent text-[#171717] border border-[#DCCB9A] hover:bg-[#F4EFE6] active:scale-[0.99]',
    ghost:
      'bg-transparent text-[#77736B] hover:text-[#171717] hover:bg-[#EFECE4]/60 active:scale-[0.99]',
    danger:
      'bg-[#991B1B] text-white hover:bg-[#7F1D1D] active:scale-[0.99] shadow-sm',
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Loading...
        </span>
      ) : (
        <span className="inline-flex items-center gap-2">
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </span>
      )}
    </button>
  );
};
