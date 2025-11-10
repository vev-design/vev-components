import React from 'react';
import styles from './Playbackrate.module.css.module.css';

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
}

export function Playbackrate({ children, onClick }: ButtonProps) {
  return (
    <div className={styles.button} onClick={onClick}>
      {children}
    </div>
  );
}
