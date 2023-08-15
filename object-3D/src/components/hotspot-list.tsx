import React, { useEffect, useState } from 'react';
import { sortBy } from 'lodash';
import { SilkeButton } from '@vev/silke';
import styles from '../object-3d.module.css';
import { InternalHotspot } from '../types';

interface Props {
  hotspots: InternalHotspot[];
  deleteHotspot: (index: number) => void;
}

export function HotspotList({ hotspots, deleteHotspot }: Props) {
  const [sortedHotspots, setSortedHotspots] = useState(hotspots);
  console.log('hotspots', hotspots);
  useEffect(() => {
    setSortedHotspots(sortBy(hotspots, 'index'));
  }, [hotspots]);

  return (
    <div className={styles.hotspotList}>
      {sortedHotspots.map((hotspot) => {
        return (
          <div key={hotspot.index} className={styles.hotspotListItem}>
            <div>{`Hotspot ${hotspot.index}`}</div>
            <SilkeButton
              icon="delete"
              onClick={() => {
                deleteHotspot(hotspot.index);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
