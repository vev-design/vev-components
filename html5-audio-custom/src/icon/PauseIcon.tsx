import React from 'react';
import styles from './Icon.module.css';

export function PauseIcon() {
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
        <path d="M96 448h106.7V64H96v384zM309.3 64v384H416V64H309.3z"></path>
      </svg>
    </div>
  );
}
