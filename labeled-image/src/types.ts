export interface Label {
  pos: { x: number; y: number };
  caption?: string;
  index: number;
  /** Key of the child frame that opens as this label's popup */
  popup?: string;
}
