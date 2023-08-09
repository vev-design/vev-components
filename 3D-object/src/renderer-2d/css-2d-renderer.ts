import { Camera, Matrix4, Object3D, Scene, Vector3 } from 'three';
import { CSS2DObject } from './css-2d-object';

/**
 * @author mrdoob / http://mrdoob.com/
 */

export class CSS2DRenderer {
  public domElement = document.createElement('div');
  private width: number;
  private height: number;
  private widthHalf: number;
  private heightHalf: number;
  private viewMatrix = new Matrix4();
  private viewProjectionMatrix = new Matrix4();
  private vector = new Vector3();
  private cache = {
    objects: new WeakMap(),
  };
  private getDistanceToSquaredA = new Vector3();
  private getDistanceToSquaredB = new Vector3();

  constructor() {
    this.domElement.style.overflow = 'hidden';
  }

  public zOrder(scene: Scene) {
    const sorted = this.filterAndFlatten(scene).sort((a, b) => {
      const distanceA = this.cache.objects.get(a).distanceToCameraSquared;
      const distanceB = this.cache.objects.get(b).distanceToCameraSquared;
      return distanceA - distanceB;
    });

    const zMax = sorted.length;

    for (let i = 0, l = sorted.length; i < l; i++) {
      sorted[i].element.style.zIndex = String(zMax - i);
    }
  }

  public getDistanceToSquared(object1: Object3D, object2: Object3D) {
    this.getDistanceToSquaredA.setFromMatrixPosition(object1.matrixWorld);
    this.getDistanceToSquaredB.setFromMatrixPosition(object2.matrixWorld);

    return this.getDistanceToSquaredA.distanceToSquared(this.getDistanceToSquaredB);
  }

  public render(scene: Scene, camera: Camera) {
    scene.updateMatrixWorld();

    if (camera.parent === null) {
      camera.updateMatrixWorld(false);
    }

    this.viewMatrix.copy(camera.matrixWorldInverse);
    this.viewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, this.viewMatrix);

    this.renderObject(scene, camera);
    this.zOrder(scene);
  }

  public getSize() {
    return {
      width: this.width,
      height: this.height,
    };
  }

  public setSize(width: number, height: number) {
    this.width = width;
    this.height = height;

    this.widthHalf = this.width / 2;
    this.heightHalf = this.height / 2;

    this.domElement.style.width = width + 'px';
    this.domElement.style.height = height + 'px';
  }

  private filterAndFlatten(scene: Scene) {
    const result: CSS2DObject[] = [];

    scene.traverse((object) => {
      if (object instanceof CSS2DObject) {
        result.push(object);
      }
    });

    return result;
  }

  private renderObject(object: Object3D, camera: Camera) {
    if (object instanceof CSS2DObject) {
      this.vector.setFromMatrixPosition(object.matrixWorld);
      this.vector.applyMatrix4(this.viewProjectionMatrix);

      const { element } = object;
      const style =
        'translate(-50%,-50%) translate(' +
        (this.vector.x * this.widthHalf + this.widthHalf) +
        'px,' +
        (-this.vector.y * this.heightHalf + this.heightHalf) +
        'px)';

      element.style.transform = style;

      element.style.display =
        object.visible && this.vector.z >= -1 && this.vector.z <= 1 ? '' : 'none';

      const objectData = {
        distanceToCameraSquared: this.getDistanceToSquared(camera, object),
      };

      this.cache.objects.set(object, objectData);

      if (element.parentNode !== this.domElement) {
        this.domElement.appendChild(element);
      }
    }

    for (let i = 0, l = object.children.length; i < l; i++) {
      this.renderObject(object.children[i], camera);
    }
  }
}
