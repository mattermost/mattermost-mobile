// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineWriters} from 'realm-react-redux';

import {GeneralTypes, TeamTypes} from 'app/realm/action_types';
import {GENERAL_SCHEMA_ID} from 'app/realm/models/general';

function general(realm, action) {
    switch (action.type) {
    case GeneralTypes.RECEIVED_GENERAL_UPDATE: {
        const {data} = action;
        const generalData = {
            id: GENERAL_SCHEMA_ID,
            serverVersion: data.serverVersion,
            deviceToken: data.deviceToken,
        };

        if (data.config) {
            generalData.serverConfig = JSON.stringify(data.config);
        }

        if (data.license) {
            generalData.serverLicense = JSON.stringify(data.license);
        }

        if (data.dataRetentionPolicy) {
            generalData.dataRetentionPolicy = JSON.stringify(data.dataRetentionPolicy);
        }

        realm.create('General', generalData, true);
        break;
    }
    case TeamTypes.SELECT_TEAM: {
        const {data} = action;
        const generalRealm = realm.objectForPrimaryKey('General', GENERAL_SCHEMA_ID);
        generalRealm.currentTeamId = data;
        break;
    }
    default:
        break;
    }
}

export default combineWriters([
    general,
]);
