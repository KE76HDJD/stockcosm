import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const variants = {
  primary: 'bg-accent text-white hover:bg-accent-hover active:bg-accent-hover dark:bg-[#3ECF8E] dark:text-[#121416] dark:hover:bg-[#5BE8A8]',
  secondary: 'bg-white text-text-primary border border-border hover:bg-porcelaine dark:bg-[#1C1F22] dark:text-[#E4E6E9] dark:border-white/[0.08] dark:hover:bg-white/[0.05]',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-porcelaine dark:text-[#8B9199] dark:hover:text-[#E4E6E9] dark:hover:bg-white/[0.05]',
  danger: 'bg-stock-rupture text-white hover:opacity-90',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-button transition-all duration-150 
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}
