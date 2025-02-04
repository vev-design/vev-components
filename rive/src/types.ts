import { StateMachineInputType } from '@rive-app/canvas';

interface StateMachineInputContents {
  name: string;
  type: StateMachineInputType;
  initialValue?: boolean | number;
}
/**
 * Contents of a state machine
 */
interface StateMachineContents {
  name: string;
  inputs: StateMachineInputContents[];
}
/**
 * Contents of an artboard
 */
interface ArtboardContents {
  animations: string[];
  stateMachines: StateMachineContents[];
  name: string;
}
/**
 * contents of a Rive file
 */
export interface RiveFileContents {
  artboards?: ArtboardContents[];
}
