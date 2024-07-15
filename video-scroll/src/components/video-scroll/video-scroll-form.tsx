import React, { useRef, useState } from 'react';
import { useDropZone } from '../../hooks/use-drop-zone';
import { unpackFrames } from '../../video-unpack';
import {
  SilkeBox,
  SilkeButton,
  SilkeUploadField,
  SilkeTextSmall,
  SilkeTab,
  SilkeTabs,
} from '@vev/silke';
import styles from './video-scroll-form.module.scss';
import { SchemaContextModel } from '@vev/utils';

type VideoScrollFormProps = {
  context: SchemaContextModel;
  value: any;
  onChange: (value: any) => void;
};

export function VideoScrollForm({ context, value, onChange }: VideoScrollFormProps) {
  const ref = useRef<HTMLLabelElement>(null);
  useDropZone(
    ref,
    (e) => {
      const file = e.dataTransfer?.files?.[0];
      setDragOver(false);
      handleUpload(file);
    },
    () => setDragOver(true),
    () => setDragOver(false),
  );
  const [progress, setProgress] = useState<number>(0);
  const [unpacking, setUnpacking] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [frame, setFrame] = useState<string>();
  const [error, setError] = useState<string | null>();
  const [previewProgress, setPreviewProgress] = useState<number>(0);
  const [isDownloadingVideo, setIsDownloadingVideo] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('library');

  const handleUpload = async (file?: File) => {
    if (!file) return;
    if (file.size > 1024 * 1024 * 512) return setError('To big file, max size is 512MB');

    const uploadFile = context.actions?.uploadFile;
    if (!uploadFile) return;
    setUnpacking(true);
    setError(null);
    try {
      const images = await unpackFrames(file, uploadFile, (progress, frame) => {
        setProgress(progress);
        setFrame(frame);
      });

      onChange(images);
    } catch (e) {
      console.error('Failed to unpack frames', e);
      setError('Failed to unpack frames');
    }
    setUnpacking(false);
  };

  const hasValue = value && value?.length > 0;
  return (
    <SilkeBox ref={ref} flex column>
      {unpacking ? (
        <SilkeBox column gap="s">
          <img
            style={{
              height: 120,
              objectFit: 'cover',
              borderRadius: 4,
            }}
            src={frame}
            alt="Unpack preview"
          />
          <SilkeTextSmall style={{ margin: 0 }}>
            Unpacking frames {Math.round(progress * 100)}%
          </SilkeTextSmall>
        </SilkeBox>
      ) : hasValue ? (
        <SilkeBox gap="s" column>
          <img
            style={{
              height: 120,
              objectFit: 'cover',
              borderRadius: 8,
            }}
            src={value[Math.floor(previewProgress * (value?.length - 1))]}
            alt="Unpack preview"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const progress = (e.pageX - rect.left) / rect.width;
              setPreviewProgress(Math.max(0, Math.min(1, progress)));
            }}
          />
          <SilkeButton onClick={() => onChange(null)} label="Remove video" kind="danger" size="s" />
        </SilkeBox>
      ) : null}
      {error && (
        <small style={{ color: 'var(--color-feedback-warning-spark)' }} className={styles.error}>
          {error}
        </small>
      )}
      {!hasValue && !unpacking && (
        <SilkeBox column>
          <SilkeBox vPad="s">
            <SilkeTabs size="s">
              <SilkeTab
                label={'Library'}
                active={activeTab === 'library'}
                onClick={() => setActiveTab('library')}
              />
              <SilkeTab
                label={'Upload'}
                active={activeTab === 'upload'}
                onClick={() => setActiveTab('upload')}
              />
            </SilkeTabs>
          </SilkeBox>
          {activeTab === 'upload' && (
            <SilkeBox flex column>
              <SilkeUploadField
                accept="video/*"
                maxSize={819200}
                onSelectFiles={(files) => {
                  console.log(files);
                  handleUpload(files[0]);
                }}
                style={{ opacity: 0, position: 'absolute' }}
              />
            </SilkeBox>
          )}
          {activeTab === 'library' && (
            <SilkeBox flex column>
              <SilkeTextSmall>Select from library</SilkeTextSmall>
              <SilkeButton
                size="s"
                loading={isDownloadingVideo}
                label="Select video"
                onClick={() => {
                  context.actions?.videoLibraryOpen(async (projectFile: any) => {
                    setIsDownloadingVideo(true);
                    const response = await fetch(projectFile.sources[0].url);
                    const data = await response.blob();
                    const metadata = {
                      type: 'video/mp4',
                    };
                    handleUpload(new File([data], 'video.mp4', metadata));
                    setIsDownloadingVideo(false);
                  });
                }}
              />
            </SilkeBox>
          )}
        </SilkeBox>
      )}
    </SilkeBox>
  );
}
