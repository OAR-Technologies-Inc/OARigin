import React from 'react';
import classNames from 'classnames';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  icon,
  className,
  disabled,
  ...props
}) => {
  const baseClasses = 'font-mono font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center';
  
  const variantClasses = {
    primary: 'bg-green-500 hover:bg-green-600 text-black shadow-[0_0_10px_rgba(0,255,0,0.5)] hover:shadow-[0_0_15px_rgba(0,255,0,0.7)] focus:ring-green-500',
    secondary: 'bg-amber-500 hover:bg-amber-600 text-black shadow-[0_0_10px_rgba(255,176,0,0.5)] hover:shadow-[0_0_15px_rgba(255,176,0,0.7)] focus:ring-amber-500',
    ghost: 'bg-transparent hover:bg-gray-800 text-green-500 hover:text-green-400 border border-green-500 hover:border-green-400 focus:ring-green-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_10px_rgba(255,0,0,0.5)] hover:shadow-[0_0_15px_rgba(255,0,0,0.7)] focus:ring-red-500',
  };
  
  const sizeClasses = {
    sm: 'text-xs px-3 py-1 rounded',
    md: 'text-sm px-4 py-2 rounded-md',
    lg: 'text-base px-6 py-3 rounded-lg',
  };
  
  const classes = classNames(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    disabled || isLoading ? 'opacity-70 cursor-not-allowed' : '',
    className
  );
  
  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="mr-2 animate-spin h-4 w-4 border-2 border-t-transparent border-white rounded-full" />
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};

export default Button;