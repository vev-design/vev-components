import React, { useCallback, useEffect, useState } from 'react';
import { SilkeButton, SilkeModal, SilkeModalContent } from '@vev/silke';
import { Object3DContextProvider } from '../context/object-3d-context';
import { ASPECT, defaultModel, FAR, FOV, LIGHTING, NEAR, NO_ANIMATION } from '../object-3d';
import { Object3dViewer } from './object-3d-viewer';
import { HotspotList } from './hotspot-list';
import styles from '../object-3d.module.css';
import { sortBy } from 'lodash';
import { StorageHotspot } from '../types';
import { useConvertedHotspots } from '../hooks/use-converted-hotspots';

export interface Context {
  value: StorageHotspot[];
  context: {
    value?: {
      hotspots?: StorageHotspot[];
      modelUrl?: {
        url?: string;
      };
    };
  };
  onChange: (hotspots: StorageHotspot[]) => void;
}

const EDITOR_WIDTH = 640;
const EDITOR_HEIGHT = 640;

export function HotspotEditorForm(context) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <SilkeModal
        hide={!modalOpen}
        title="Edit hotspots"
        onClose={() => {
          setModalOpen(false);
        }}
      >
        <HotSpotModal context={context} />
      </SilkeModal>
      <SilkeButton
        style={{ width: '100%' }}
        label="Edit hotspots"
        onClick={() => {
          setModalOpen(!modalOpen);
        }}
      />
    </>
  );
}

export function HotSpotModal({ context }: { context: Context }) {
  // Convert positions from storage from x,y,z to Vector3
  const [hotspots, setHotspots] = useConvertedHotspots(context.context?.value?.hotspots);

  const modelUrl = context.context.value?.modelUrl?.url;

  const deleteHotspot = useCallback(
    (index: number) => {
      const newHotspots = hotspots.filter((hotspot) => hotspot.index !== index);
      const sortedHotspots = sortBy(newHotspots, 'index');
      sortedHotspots.forEach((hotspot, index) => {
        hotspot.index = index + 1;
      });
      context.onChange(sortedHotspots);
      setHotspots(sortedHotspots);
    },
    [context, hotspots, setHotspots],
  );

  useEffect(() => {
    context.onChange([]);
  }, [modelUrl]);

  return (
    <SilkeModalContent>
      <Object3DContextProvider
        values={{
          editMode: true,
          height: EDITOR_HEIGHT,
          width: EDITOR_WIDTH,
          modelUrl: modelUrl || defaultModel.url,
          far: FAR,
          fov: FOV,
          aspect: ASPECT,
          near: NEAR,
          hdri: LIGHTING.hdri1,
          rotate: false,
          controls: true,
          animation: NO_ANIMATION,
          zoom: true,
          hotspots: hotspots || [],
          addHotSpot: (spot) => {
            const newHotspot = { index: hotspots.length + 1, position: spot };
            context.onChange([newHotspot, ...hotspots]);
            setHotspots([newHotspot, ...hotspots]);
          },
        }}
      >
        <div className="trQ35DZLjAWC0nWJxVvB_Object3d">
          <div className={styles.hotspotEditor}>
            <Object3dViewer className={styles.editorViewer} />
            <HotspotList hotspots={hotspots} deleteHotspot={deleteHotspot} />
          </div>
        </div>
      </Object3DContextProvider>
    </SilkeModalContent>
  );
}
