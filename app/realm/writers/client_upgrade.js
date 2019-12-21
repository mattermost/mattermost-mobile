// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineWriters} from 'realm-react-redux';
import {ClientUpgradeTypes} from 'app/realm/action_types';

function clientUpgrade(realm, action) {
    switch (action.type) {
    case ClientUpgradeTypes.SET_LAST_UPGRADE_CHECK: {
        realm.create('ClientUpgrade', {lastUpdateCheck: Date.now()}, true);
        break;
    }

    default:
        break;
    }
}

export default combineWriters([
    clientUpgrade,
]);