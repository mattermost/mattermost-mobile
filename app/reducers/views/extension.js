// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import {combineReducers} from 'redux';

import {ViewTypes} from 'app/constants';

function selectedTeamId(state = '', action) {
    switch (action.type) {
    case ViewTypes.EXTENSION_SELECTED_TEAM_ID: {
        return action.data;
    }
    default:
        return state;
    }
}

export default combineReducers({
    selectedTeamId,
});
