// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject, Observable} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

// ----------------------------------------------------------------------------------- //
// ----------------------------------------------------------------------------------- //

export class SubjectStore<StateType = any> {
    private stateSubject: BehaviorSubject<StateType>;

    // I initialize the simple store with the givne initial state value.
    constructor(initialState: StateType) {
        this.stateSubject = new BehaviorSubject(initialState);
    }

    // ---
    // PUBLIC METHODS.
    // ---

    // I get the current state as a stream (will always emit the current state value as
    // the first item in the stream).
    public getState(): Observable<StateType> {
        return (this.stateSubject.pipe(distinctUntilChanged()));
    }

    public getValue(): StateType {
        return this.stateSubject.value;
    }

    // I get the current state snapshot.
    public getStateSnapshot(): StateType {
        return (this.stateSubject.getValue());
    }

    // I return the given top-level state key as a stream (will always emit the current
    // key value as the first item in the stream).
    public select<K extends keyof StateType>(selector: (state: StateType) => StateType[K]): Observable<StateType[K]> {
        const selectStream = this.stateSubject.pipe(
            map(
                (state: StateType) => selector(state),
            ),
            distinctUntilChanged(),
        );

        return (selectStream);
    }

    // I move the store to a new state by merging the given partial state into the
    // existing state (creating a new state object).
    // --
    // CAUTION: Partial<T> does not currently project against "undefined" values. This is
    // a known type safety issue in TypeScript.
    public setState(partialState: Partial<StateType>): void {
        const currentState = this.getStateSnapshot();
        const nextState = Object.assign({}, currentState, partialState);

        this.stateSubject.next(nextState);
    }
}
