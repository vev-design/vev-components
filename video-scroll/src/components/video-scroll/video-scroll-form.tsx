import { SchemaContextModel } from '@vev/react';
import React, { useRef, useState } from 'react';
import { useDropZone } from '../../hooks/use-drop-zone';
import { unpackFrames } from '../../video-unpack';
import styles from './video-scroll-form.module.scss';

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

  const hasValue = value && value.length > 0;
  return (
    <label
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        borderRadius: '8px',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        border: '1px solid var(--color-neutral-low-soft)',
      }}
      className={styles.label + (!unpacking && dragOver ? ' ' + styles.dragOver : '')}
    >
      {unpacking ? (
        <>
          <img
            style={{
              height: 120,
              objectFit: 'cover',
              borderRadius: 8,
            }}
            src={frame}
            alt="Unpack preview"
          />
          <h5 style={{ margin: 0 }}>Unpacking frames {Math.round(progress * 100)}%</h5>
        </>
      ) : (
        <>
          {hasValue && (
            <img
              style={{
                height: 120,
                objectFit: 'cover',
                borderRadius: 8,
              }}
              src={value[Math.floor(previewProgress * (value.length - 1))]}
              alt="Unpack preview"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const progress = (e.pageX - rect.left) / rect.width;
                setPreviewProgress(Math.max(0, Math.min(1, progress)));
              }}
            />
          )}
          <h5 style={{ margin: 0 }}>
            {hasValue ? `Unpacked video with ${value.length} frames` : 'Drop video files here'}
          </h5>
          {error ? (
            <small
              style={{ color: 'var(--color-feedback-warning-spark)' }}
              className={styles.error}
            >
              {error}
            </small>
          ) : (
            <small style={{ color: '--color-neutral-high-soft' }}>
              {hasValue ? 'Drop or click to browse for new video' : '(Click to browse)'}
            </small>
          )}
          <input
            type="file"
            accept="video/*"
            onChange={(e) => handleUpload(e.currentTarget.files?.[0])}
            style={{ opacity: 0, position: 'absolute' }}
          />
        </>
      )}
    </label>
  );
}
