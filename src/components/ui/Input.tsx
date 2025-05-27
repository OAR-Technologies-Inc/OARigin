import React, { forwardRef } from 'react';
import classNames from 'classnames';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = false, className, ...props }, ref) => {
    const inputClasses = classNames(
      'font-mono bg-gray-900 border rounded-md px-4 py-2 w-full text-green-500 placeholder-gray-500',
      'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
      'shadow-[0_0_5px_rgba(0,255,0,0.2)]',
      'transition-all duration-200',
      error ? 'border-red-500' : 'border-gray-700',
      className
    );

    return (
      <div className={classNames('mb-4', fullWidth ? 'w-full' : '')}>
        {label && (
          <label className="block text-green-400 font-mono text-sm mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={inputClasses}
          {...props}
        />
        {error && (
          <p className="mt-1 text-red-500 text-xs">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;