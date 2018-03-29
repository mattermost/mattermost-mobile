// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ViewTypes} from 'app/constants';

export function setLastUpgradeCheck() {
    return {
        type: ViewTypes.SET_LAST_UPGRADE_CHECK,
    };
}
