import React from 'react';
import classNames from 'classnames';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'green' | 'amber' | 'purple' | 'none';
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className,
  glowColor = 'green'
}) => {
  const glowClasses = {
    green: 'shadow-[0_0_15px_rgba(0,255,0,0.3)]',
    amber: 'shadow-[0_0_15px_rgba(255,176,0,0.3)]',
    purple: 'shadow-[0_0_15px_rgba(157,0,255,0.3)]',
    none: ''
  };
  
  const classes = classNames(
    'bg-gray-900 border border-gray-800 rounded-lg overflow-hidden',
    glowClasses[glowColor],
    className
  );
  
  return (
    <div className={classes}>
      {children}
    </div>
  );
};

export default Card;