import React from 'react';
import { Terminal } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
}

const Logo: React.FC<LogoProps> = ({ size = 'md', variant = 'full' }) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl'
  };
  
  const iconSizeMap = {
    sm: 18,
    md: 24,
    lg: 36
  };
  
  return (
    <div className={`flex items-center ${sizeClasses[size]} font-mono font-bold text-green-500`}>
      <Terminal size={iconSizeMap[size]} className="mr-2" />
      {variant === 'full' && (
        <span className="relative">
          OAR<span className="text-amber-500">igin</span>
          <span className="absolute -top-1 right-0 h-1 w-1 rounded-full bg-green-500 animate-pulse"></span>
        </span>
      )}
    </div>
  );
};

export default Logo;