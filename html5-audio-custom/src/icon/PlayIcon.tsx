import React from 'react';
import styles from './Icon.module.css';

export function PlayIcon() {
  return (
    <div className={styles.icon}>
      <svg
        stroke="currentColor"
        fill="currentColor"
        strokeWidth="0"
        viewBox="0 0 512 512"
        height="100%"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M96 52v408l320-204L96 52z"></path>
      </svg>
    </div>
  );
}
