import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Box3,
  Group,
  LoopRepeat,
  Object3D,
  Vector3,
} from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { useContext, useEffect, useRef, useState } from 'react';
import { Object3dContext } from '../context/object-3d-context';
import { disposeObject } from '../util/dispose-object';
import { buildBoundsTrees } from '../util/bounds-tree';
import { anchorLegacyHotspots } from '../util/hotspot-anchor';
import { HotspotAnchor } from '../types';

const FADE_DURATION = 0.2;

/**
 * Adds the loaded model to the scene, and plays its animations.
 * Owns the model from here on: it disposes the model when it is replaced or unmounted.
 *
 * Also prepares hotspot occlusion: `occluder` is set to the model once its raycast index is built,
 * and `legacyAnchors` holds anchors for saved hotspots that have none (animated models only).
 */
export function useSceneModel(
  pivot: Group | undefined,
  gltf: GLTF | undefined,
  invalidate: () => void,
) {
  const { animation, eventCallbacks, onAnimationFinished, hotspots } = useContext(Object3dContext);

  const [currentModel, setCurrentModel] = useState<Object3D | null>(null);
  const modelRoot = useRef<Object3D | null>(null);
  const clips = useRef<AnimationClip[]>([]);
  const mixer = useRef<AnimationMixer | null>(null);
  const actions = useRef(new Set<AnimationAction>());
  const currentAction = useRef<AnimationAction | null>(null);
  // The last looping clip. A one-shot clip fades back to it when it finishes.
  const loopAction = useRef<AnimationAction | null>(null);
  const clipDuration = useRef(0);
  // Set by the Pause/Resume animation interactions. Scroll-driven animation ignores it.
  const paused = useRef(false);
  const occluder = useRef<Object3D | null>(null);
  const legacyAnchors = useRef(new Map<number, HotspotAnchor>());
  const cancelBoundsTrees = useRef<(() => void) | null>(null);
  const hotspotsRef = useRef(hotspots);
  hotspotsRef.current = hotspots;

  const onAnimationFinishedRef = useRef(onAnimationFinished);
  onAnimationFinishedRef.current = onAnimationFinished;

  function onFinished({ action }: { action: AnimationAction }) {
    if (onAnimationFinishedRef.current) onAnimationFinishedRef.current(action.getClip().name);

    const back = loopAction.current;
    if (action !== currentAction.current || !back || back === action) return;

    back.reset().setEffectiveWeight(1).play();
    action.crossFadeTo(back, FADE_DURATION, false);
    currentAction.current = back;
    clipDuration.current = back.getClip().duration;
    invalidate();
  }
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  const finishedListener = useRef((event: any) => onFinishedRef.current(event)).current;

  function playAnimation(name: string | undefined, loop = true, repetitions = 1) {
    if (!mixer.current) return;
    paused.current = false;

    const clip = clips.current.find((candidate) => candidate.name === name);
    const previous = currentAction.current;

    // "No animation", or a name the model does not have: stop the current clip
    if (!clip) {
      if (previous) previous.fadeOut(FADE_DURATION);
      currentAction.current = null;
      loopAction.current = null;
      clipDuration.current = 0;
      invalidate();
      return;
    }

    const action = mixer.current.clipAction(clip);
    action.reset();
    action.setLoop(LoopRepeat, loop ? Infinity : Math.max(1, repetitions || 1));
    action.clampWhenFinished = !loop;
    action.setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (previous && previous !== action) previous.crossFadeTo(action, FADE_DURATION, false);

    if (loop) loopAction.current = action;
    currentAction.current = action;
    actions.current.add(action);
    clipDuration.current = clip.duration;
    invalidate();
  }

  // Add the model to the scene, and remove the previous one
  useEffect(() => {
    if (!pivot) return;
    const next = gltf ? gltf.scene : null;
    if (next === modelRoot.current) return;

    if (mixer.current) {
      mixer.current.stopAllAction();
      mixer.current.removeEventListener('finished', finishedListener);
      mixer.current = null;
    }
    actions.current.clear();
    currentAction.current = null;
    loopAction.current = null;
    clipDuration.current = 0;

    if (cancelBoundsTrees.current) cancelBoundsTrees.current();
    cancelBoundsTrees.current = null;
    occluder.current = null;
    legacyAnchors.current = new Map();

    if (modelRoot.current) {
      pivot.remove(modelRoot.current);
      disposeObject(modelRoot.current);
    }

    if (next && gltf) {
      // Center the model on the origin, so the camera orbits around it
      next.updateMatrixWorld();
      const center = new Box3().setFromObject(next).getCenter(new Vector3());
      next.position.sub(center);

      // Before the model joins the pivot and before any animation runs: the hotspots were placed
      // in this pose, in pivot space. Only animated models need anchors for old hotspots.
      if (gltf.animations.length) {
        legacyAnchors.current = anchorLegacyHotspots(next, hotspotsRef.current);
      }

      pivot.add(next);

      mixer.current = new AnimationMixer(next);
      mixer.current.addEventListener('finished', finishedListener);

      cancelBoundsTrees.current = buildBoundsTrees(next, () => {
        occluder.current = next;
        invalidate();
      });
    }

    clips.current = gltf ? gltf.animations : [];
    modelRoot.current = next;
    setCurrentModel(next);
    invalidate();
  }, [pivot, gltf]);

  useEffect(() => {
    if (pivot && gltf) playAnimation(animation);
  }, [pivot, gltf, animation]);

  // Runs on every render, so the callback always sees the current state
  useEffect(() => {
    if (!eventCallbacks) return;
    eventCallbacks.play_animation((name: string, loop: boolean, repetitions: number) => {
      playAnimation(name, loop !== false, repetitions);
    });
    eventCallbacks.pause_animation(() => {
      paused.current = true;
    });
    eventCallbacks.resume_animation(() => {
      paused.current = false;
      invalidate();
    });
  });

  // Dispose the model on unmount
  useEffect(() => {
    return () => {
      if (cancelBoundsTrees.current) cancelBoundsTrees.current();
      if (mixer.current) mixer.current.stopAllAction();
      if (modelRoot.current) disposeObject(modelRoot.current);
    };
  }, []);

  function isAnimating() {
    for (const action of actions.current) {
      if (action.isRunning()) return true;
    }
    return false;
  }

  return { currentModel, mixer, clipDuration, paused, isAnimating, occluder, legacyAnchors };
}
