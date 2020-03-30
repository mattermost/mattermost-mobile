// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Reducer} from '@mm-redux/types/actions';
import {Dictionary} from '@mm-redux/types/utilities';

// Based on http://nicolasgallagher.com/redux-modules-and-code-splitting/
export class ReducerRegistry {
    emitChange?: Function;
    reducers: Dictionary<Reducer> = {};

    setReducers = (reducers: Dictionary<Reducer>) => {
        this.reducers = reducers;
    }

    getReducers = () => {
        return {...this.reducers};
    }

    register = (name: string, reducer: Reducer) => {
        this.reducers = {...this.reducers, [name]: reducer};
        if (this.emitChange) {
            this.emitChange(this.getReducers());
        }
    }

    setChangeListener = (listener: Function) => {
        this.emitChange = listener;
    }
}

const reducerRegistry = new ReducerRegistry();
export default reducerRegistry;
