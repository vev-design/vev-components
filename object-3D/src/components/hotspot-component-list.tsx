import React from 'react';
import * as Silke from '@vev/silke';
import { SilkeBox, SilkeTextSmall } from '@vev/silke';
import { CustomHotspot } from '../context/object-3d-context';
import { StorageHotspot } from '../types';

// At runtime `@vev/silke` is the editor's own Silke (a CLI external), so this hook reads the
// editor's field registry, which includes its main component picker. The installed @vev/silke
// types predate `useExtendedFields`.
const useExtendedFields: () => { type: string; field: React.ComponentType<any> }[] =
  (Silke as any).useExtendedFields ?? (() => []);

interface Props {
  hotspots: StorageHotspot[];
  onChange: (hotspots: StorageHotspot[]) => void;
}

/** One main component picker per hotspot. The component is saved on the hotspot. */
export function HotspotComponentList({ hotspots, onChange }: Props) {
  const MainComponentField = useExtendedFields().find(
    (field) => field.type === 'mainComponent',
  )?.field;
  if (!MainComponentField || hotspots.length === 0) return null;

  const sorted = [...hotspots].sort((a, b) => a.index - b.index);

  return (
    <SilkeBox column gap="s" style={{ paddingBottom: '10px' }}>
      <SilkeTextSmall>Empty hotspots show the numbered circle.</SilkeTextSmall>
      {sorted.map((hotspot) => (
        <MainComponentField
          key={hotspot.index}
          schema={{
            type: 'mainComponent',
            name: `hotspot${hotspot.index}`,
            title: `Hotspot ${hotspot.index}`,
            placeholder: 'Numbered circle',
          }}
          value={hotspot.component}
          onChange={(component?: CustomHotspot) => {
            onChange(
              hotspots.map((item) =>
                item === hotspot
                  ? { ...item, component: component?.mainComponent ? component : undefined }
                  : item,
              ),
            );
          }}
        />
      ))}
    </SilkeBox>
  );
}
