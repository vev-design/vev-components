import React from 'react';
import styles from './Button.module.css';

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({ children, onClick }: ButtonProps) {
  return (
    <div className={styles.button} onClick={onClick}>
      {children}
    </div>
  );
}
