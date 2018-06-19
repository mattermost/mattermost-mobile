// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
const initialState = {
    lastUpdateCheck: 0,
};

import {ViewTypes} from 'app/constants';

export default function clientUpgrade(state = initialState, action) {
    switch (action.type) {
    case ViewTypes.SET_LAST_UPGRADE_CHECK:
        return {
            lastUpdateCheck: Date.now(),
        };
    default:
        return state;
    }
}
