// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ViewTypes} from 'app/constants';

export function setLastUpgradeCheck() {
    return {
        type: ViewTypes.SET_LAST_UPGRADE_CHECK,
    };
}
