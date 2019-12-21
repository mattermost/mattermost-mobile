// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ClientUpgradeTypes} from 'app/realm/action_types';

export function setLastUpgradeCheck() {
    return async (dispatch) => {
        try {
            dispatch({type: ClientUpgradeTypes.SET_LAST_UPGRADE_CHECK});
        } catch (error) {
            console.log('Failed to update setLastUpgradeCheck'); // eslint-disable-line no-console
        }
    };
}