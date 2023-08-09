/**
 * @author mrdoob / http://mrdoob.com/
 */
import { Object3D } from 'three';

export class CSS2DObject extends Object3D {
  public element: HTMLElement;

  constructor(element: HTMLElement) {
    super();

    this.element = element;
    this.element.style.position = 'absolute';

    this.addEventListener('removed', function () {
      if (this.element.parentNode !== null) {
        this.element.parentNode.removeChild(this.element);
      }
    });
  }
}
