import React, { useEffect, useState } from 'react';
import { sortBy } from 'lodash';
import { SilkeButton, SilkeText, SilkeBox } from '@vev/silke';
import styles from '../object-3d.module.css';
import { InternalHotspot } from '../types';

interface Props {
  hotspots: InternalHotspot[];
  deleteHotspot: (index: number) => void;
}

export function HotspotList({ hotspots, deleteHotspot }: Props) {
  const [sortedHotspots, setSortedHotspots] = useState(hotspots);

  useEffect(() => {
    setSortedHotspots(sortBy(hotspots, 'index'));
  }, [hotspots]);

  return (
    <div className={styles.hotspotList}>
      <SilkeBox gap="s" column>
        <SilkeText>
          Add hotspot(s) on your 3D model by clicking on the target area. Connect the hotspots to
          components on the canvas using Interactions.
        </SilkeText>
        {sortedHotspots.map((hotspot) => {
          return (
            <div key={hotspot.index} className={styles.hotspotListItem}>
              <div>{`Hotspot ${hotspot.index}`}</div>
              <SilkeButton
                size="s"
                icon="delete"
                kind="ghost"
                onClick={() => {
                  deleteHotspot(hotspot.index);
                }}
              />
            </div>
          );
        })}
      </SilkeBox>
    </div>
  );
}
