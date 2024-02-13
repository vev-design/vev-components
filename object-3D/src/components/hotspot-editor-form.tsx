import React, { useCallback, useEffect, useState } from "react";
import { SilkeButton, SilkeModal, SilkeModalContent } from "@vev/silke";
import { Object3DContextProvider } from "../context/object-3d-context";
import {
  ASPECT,
  defaultModel,
  FAR,
  FOV,
  LIGHTING,
  NEAR,
  NO_ANIMATION,
} from "../object-3d";
import { Object3dViewer } from "./object-3d-viewer";
import { HotspotList } from "./hotspot-list";
import styles from "../object-3d.module.css";
import { sortBy } from "lodash";
import { StorageHotspot } from "../types";
import { useConvertedHotspots } from "../hooks/use-converted-hotspots";
import { ObjectField, SchemaFieldProps } from "@vev/react";

const EDITOR_WIDTH = 640;
const EDITOR_HEIGHT = 640;

interface Props {
  context: SchemaFieldProps<ObjectField>;
  onChange: (hotspots: StorageHotspot[]) => void;
}

export function HotspotEditorForm({ context, onChange }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      {modalOpen && (
        <SilkeModal
          hide={!modalOpen}
          title="Edit hotspots"
          onClose={() => {
            setModalOpen(false);
          }}
        >
          <HotSpotModal context={context} onChange={onChange} />
        </SilkeModal>
      )}
      <SilkeButton
        kind="tertiary"
        size="s"
        style={{ width: "100%" }}
        label="Edit hotspots"
        onClick={() => {
          setModalOpen(!modalOpen);
        }}
      />
    </>
  );
}

export function HotSpotModal({
  context,
  onChange,
}: {
  context: SchemaFieldProps<ObjectField>;
  onChange: (hotspots: StorageHotspot[]) => void;
}) {
  // Convert positions from storage from x,y,z to Vector3
  const [hotspots, setHotspots] = useConvertedHotspots(
    context?.value?.hotspots
  );

  const modelUrl = context.context.value?.modelUrl?.url;

  const deleteHotspot = useCallback(
    (index: number) => {
      const newHotspots = hotspots.filter((hotspot) => hotspot.index !== index);
      const sortedHotspots = sortBy(newHotspots, "index");
      sortedHotspots.forEach((hotspot, index) => {
        hotspot.index = index + 1;
      });
      onChange(sortedHotspots);
      setHotspots(sortedHotspots);
    },
    [context, hotspots, setHotspots, onChange]
  );

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
          zoom: false,
          rotationSpeed: 2,
          hotspots: hotspots || [],
          addHotSpot: (spot) => {
            const newHotspot = { index: hotspots.length + 1, position: spot };
            onChange([newHotspot, ...hotspots]);
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
