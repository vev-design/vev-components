/**
 * Shared Animation Manager for Galaxy Components
 * 
 * Optimizes requestAnimationFrame by using a single loop for all instances.
 * Works across separate React apps/builds by using a global window object.
 * Provides significant performance improvements for multiple instances while
 * maintaining efficiency for single instances.
 */

type AnimationCallback = (timestamp: number, delta: number) => void;

interface InstanceData {
  id: string;
  callback: AnimationCallback;
  priority: number; // Higher priority = updates first
  paused: boolean;
  lastUpdate: number;
}

// Global window interface for cross-app communication
declare global {
  interface Window {
    __GalaxyAnimationManager__?: AnimationManager;
  }
  
  interface Navigator {
    deviceMemory?: number;
  }
  
  interface Document {
    __galaxyVisibilityListenerAdded?: boolean;
  }
}

class AnimationManager {
  private instances: Map<string, InstanceData> = new Map();
  private animationId: number | null = null;
  private lastTimestamp: number = 0;
  private frameCount: number = 0;
  private lastFpsCheck: number = 0;
  private targetFps: number = 60;
  private minFrameTime: number = 1000 / 60;
  private frameSkip: number = 0;
  private isLowEndDevice: boolean;

  constructor() {
    // Detect low-end devices
    this.isLowEndDevice = 
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
      (navigator.deviceMemory && navigator.deviceMemory <= 4);
    
    this.targetFps = this.isLowEndDevice ? 30 : 60;
    this.minFrameTime = 1000 / this.targetFps;
    this.frameSkip = this.isLowEndDevice ? 1 : 0;
  }

  /**
   * Register an instance to be updated in the animation loop
   */
  register(id: string, callback: AnimationCallback, priority: number = 0): void {
    this.instances.set(id, {
      id,
      callback,
      priority,
      paused: false,
      lastUpdate: performance.now(),
    });

    // Start the loop if this is the first instance
    if (this.instances.size === 1 && !this.animationId) {
      this.start();
    }
  }

  /**
   * Unregister an instance
   */
  unregister(id: string): void {
    this.instances.delete(id);

    // Stop the loop if no instances remain
    if (this.instances.size === 0 && this.animationId) {
      this.stop();
    }
  }

  /**
   * Pause an instance (won't be updated but stays registered)
   */
  pause(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.paused = true;
    }
  }

  /**
   * Resume a paused instance
   */
  resume(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.paused = false;
      // Reset lastUpdate to prevent huge delta on first frame after resume
      instance.lastUpdate = performance.now();
    }
  }

  /**
   * Update instance priority
   */
  setPriority(id: string, priority: number): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.priority = priority;
    }
  }

  /**
   * Start the shared animation loop
   */
  private start(): void {
    this.lastTimestamp = performance.now();
    this.lastFpsCheck = this.lastTimestamp;
    this.frameCount = 0;
    this.loop(this.lastTimestamp);
  }

  /**
   * Stop the shared animation loop
   */
  private stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Main animation loop - updates all registered instances
   */
  private loop = (timestamp: number): void => {
    this.animationId = requestAnimationFrame(this.loop);

    // Adaptive frame skipping for low-end devices
    const elapsed = timestamp - this.lastTimestamp;
    if (elapsed < this.minFrameTime && this.frameSkip > 0) {
      this.frameSkip--;
      return;
    }

    // Calculate delta time
    const delta = this.lastTimestamp > 0 
      ? (timestamp - this.lastTimestamp) / 1000 
      : 0;
    
    this.lastTimestamp = timestamp;

    // Performance monitoring - adjust quality if FPS drops
    this.frameCount++;
    if (timestamp - this.lastFpsCheck > 1000) {
      const fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsCheck = timestamp;
      
      // Adaptive frame skipping based on performance
      if (fps < this.targetFps * 0.7 && this.frameSkip < 2) {
        this.frameSkip++;
      } else if (fps > this.targetFps * 0.9 && this.frameSkip > 0) {
        this.frameSkip--;
      }
    }

    // Skip frame if needed
    if (this.frameSkip > 0 && elapsed < this.minFrameTime * (this.frameSkip + 1)) {
      return;
    }

    // Update all active instances (sorted by priority, highest first)
    const activeInstances = Array.from(this.instances.values())
      .filter(instance => !instance.paused)
      .sort((a, b) => b.priority - a.priority);

    // Helper to calculate per-instance delta (prevents glitches on resume)
    const getInstanceDelta = (instance: InstanceData): number => {
      const timeSinceLastUpdate = timestamp - instance.lastUpdate;
      // Cap delta to prevent huge jumps when resuming (max 1/30th of a second = ~33ms)
      // This prevents visual glitches when instances come back into view
      const maxDelta = 1 / 30; // ~33ms
      const instanceDelta = Math.min(timeSinceLastUpdate / 1000, maxDelta);
      return instanceDelta;
    };

    // Use requestIdleCallback for non-critical updates if available
    if (activeInstances.length > 5 && 'requestIdleCallback' in window) {
      // Update first 5 instances immediately (visible/high priority)
      const immediate = activeInstances.slice(0, 5);
      const deferred = activeInstances.slice(5);

      immediate.forEach(instance => {
        try {
          const instanceDelta = getInstanceDelta(instance);
          instance.callback(timestamp, instanceDelta);
          instance.lastUpdate = timestamp;
        } catch (error) {
          console.error(`Error updating instance ${instance.id}:`, error);
        }
      });

      // Defer remaining instances
      requestIdleCallback(() => {
        deferred.forEach(instance => {
          try {
            const instanceDelta = getInstanceDelta(instance);
            instance.callback(timestamp, instanceDelta);
            instance.lastUpdate = timestamp;
          } catch (error) {
            console.error(`Error updating instance ${instance.id}:`, error);
          }
        });
      }, { timeout: 16 }); // Max 16ms delay
    } else {
      // Update all instances synchronously (better for single/few instances)
      activeInstances.forEach(instance => {
        try {
          const instanceDelta = getInstanceDelta(instance);
          instance.callback(timestamp, instanceDelta);
          instance.lastUpdate = timestamp;
        } catch (error) {
          console.error(`Error updating instance ${instance.id}:`, error);
        }
      });
    }
  };

  /**
   * Get current FPS estimate
   */
  getFps(): number {
    return this.frameCount;
  }

  /**
   * Get number of active instances
   */
  getInstanceCount(): number {
    return this.instances.size;
  }

  /**
   * Check if manager is running
   */
  isRunning(): boolean {
    return this.animationId !== null;
  }
}

/**
 * Get or create the shared AnimationManager instance
 * Works across separate React apps/builds by using window global
 */
export const getAnimationManager = (): AnimationManager => {
  // Check if there's already a manager on the window (from another app/bundle)
  if (typeof window !== 'undefined' && window.__GalaxyAnimationManager__) {
    return window.__GalaxyAnimationManager__;
  }
  
  // Create new manager and store on window for cross-app sharing
  const manager = new AnimationManager();
  if (typeof window !== 'undefined') {
    window.__GalaxyAnimationManager__ = manager;
  }
  
  return manager;
};

// Export singleton instance for convenience (uses shared global)
export const animationManager = getAnimationManager();

// Visibility API integration for automatic pausing
if (typeof document !== 'undefined') {
  // Only add listener once (check if already added)
  if (!document.__galaxyVisibilityListenerAdded) {
    document.addEventListener('visibilitychange', () => {
      // Individual instances handle their own visibility
      // This is just a global handler if needed
    });
    (document as any).__galaxyVisibilityListenerAdded = true;
  }
}

