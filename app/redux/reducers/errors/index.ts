// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {ErrorTypes} from '@redux/action_types';
import {GenericAction} from '@redux/types/actions';
export default ((state: Array<{error: any;displayable?: boolean;date: string}> = [], action: GenericAction) => {
    switch (action.type) {
    case ErrorTypes.DISMISS_ERROR: {
        const nextState = [...state];
        nextState.splice(action.index!, 1);

        return nextState;
    }
    case ErrorTypes.LOG_ERROR: {
        const nextState = [...state];
        const {displayable, error} = action;
        nextState.push({
            displayable,
            error,
            date: new Date(Date.now()).toUTCString(),
        });

        return nextState;
    }
    case ErrorTypes.RESTORE_ERRORS:
        return action.data;
    case ErrorTypes.CLEAR_ERRORS: {
        return [];
    }
    default:
        return state;
    }
});
