// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {GlobalState} from './store';

export type GetStateFunc = () => GlobalState;
export type GenericAction = {
    type: string;
    data?: any;
    meta?: any;
    error?: any;
    index?: number;
    displayable?: boolean;
    postId?: string;
    sessionId?: string;
    currentUserId?: string;
    remove?: Function|string[];
    timestamp?: number;
    [extraProps: string]: any;
};
export type Thunk = (b: DispatchFunc, a: GetStateFunc) => Promise<ActionResult> | ActionResult;

type BatchAction = {
    type: 'BATCHING_REDUCER.BATCH';
    payload: Array<GenericAction>;
    meta: {
        batch: true;
    };
};
export type Action = GenericAction | Thunk | BatchAction | ActionFunc;

export type ActionResult = {
    data: any;
} | {
    error: any;
};

export type DispatchFunc = (action: Action, getState?: GetStateFunc | null) => Promise<ActionResult>;
export type ActionFunc = (dispatch: DispatchFunc, getState: GetStateFunc) => Promise<ActionResult|ActionResult[]> | ActionResult;
export type PlatformType = 'web' | 'ios' | 'android';

export const BATCH = 'BATCHING_REDUCER.BATCH';

export function batchActions(actions: Action[], type = BATCH) {
    return {type, meta: {batch: true}, payload: actions};
}

export type Reducer<S = any, A extends Action = Action> = (
    state: S | undefined,
    action: A
  ) => S

export function enableBatching<S>(reduce: Reducer<S>): Reducer<S> {
    return function batchingReducer(state, action) {
        if (action && 'meta' in action && action.meta.batch) {
            return action.payload.reduce(batchingReducer, state);
        }
        return reduce(state, action);
    };
}
