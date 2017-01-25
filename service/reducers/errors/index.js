// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ErrorTypes} from 'service/constants';

export default (state = [], action) => {
    switch (action.type) {
    case ErrorTypes.DISMISS_ERROR: {
        const nextState = [...state];
        nextState.splice(action.index, 1);

        return nextState;
    }
    case ErrorTypes.GENERAL_ERROR: {
        const nextState = [...state];
        const {type, ...errorProps} = action;

        nextState.push(errorProps);

        return nextState;
    }
    default:
        return state;
    }
};
