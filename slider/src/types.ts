import { RefObject } from "react";


export type Props = {
    hostRef: RefObject<any>;
    children: string[];
    animation: 'slide' | 'zoom' | 'fade' | '3d' | 'none';
    speed?: number;
    selectedIndex?: number;
    gap?: number;
    random?: boolean;
    infinite?: boolean;
    perspective?: number;
    scaleFactor?: number;
    easing?: string;
    shrinkFactorBeforeAfter?: number;
    direction: 'HORIZONTAL' | 'HORIZONTAL_REVERSE' | 'VERTICAL' | 'VERTICAL_REVERSE';
    slides: string[];
    editMode?: boolean;
    index: number;
    slidesToLoad: number;
    disableSwipe?: boolean;
    transitionSpeed: number;
    resetTransitionSpeed: () => void;
};

export enum Interactions {
    NEXT = 'NEXT',
    PREV = 'PREV',
    SET = 'SET',
}

export enum Events {
    SLIDE_CHANGED = 'SLIDE_CHANGED',
    SLIDE_DID_CHANGED = 'SLIDE_DID_CHANGED',
}
