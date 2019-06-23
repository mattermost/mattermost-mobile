// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NavigationTypes} from 'app/constants';
import {UserTypes} from 'mattermost-redux/action_types';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

const initialState = {
    componentIds: [],
};

export default function(state = initialState, action) {
    switch (action.type) {
    case UserTypes.LOGOUT_SUCCESS:
        setTimeout(() => {
            EventEmitter.emit(NavigationTypes.NAVIGATION_RESET);
        });
        break;
    case NavigationTypes.ADD_TOP_SCREEN_COMPONENT_ID:
        return {
            componentIds: [
                action.componentId,
                ...state.componentIds,
            ],
        };
    case NavigationTypes.REMOVE_TOP_SCREEN_COMPONENT_ID:
        return {
            componentIds: state.componentIds.filter((id) => id !== action.componentId),
        };
    }

    return state;
}
