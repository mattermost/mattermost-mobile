// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Realm from 'realm';

export const GENERAL_SCHEMA_ID = 'general';

export default class General extends Realm.Object {
    get config() {
        try {
            return JSON.parse(this.serverConfig);
        } catch {
            return null;
        }
    }

    get license() {
        try {
            return JSON.parse(this.serverLicense);
        } catch {
            return null;
        }
    }

    get dataRetentionPolicyAsJson() {
        try {
            return JSON.parse(this.dataRetentionPolicy);
        } catch {
            return null;
        }
    }

    static schema = {
        name: 'General',
        primaryKey: 'id',
        properties: {
            id: 'string',
            currentChannelId: 'string?',
            currentTeamId: 'string?',
            currentUserId: 'string?',
            dataRetentionPolicy: 'string?',
            deviceToken: 'string?',
            serverConfig: 'string?',
            serverLicense: 'string?',
            serverVersion: 'string?',
        },
    }
}
