// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const GENERAL_SCHEMA_ID = 'general';

export default class General {
    get configAsJson() {
        try {
            return JSON.parse(this.config);
        } catch {
            return null;
        }
    }

    get licenseAsJson() {
        try {
            return JSON.parse(this.license);
        } catch {
            return null;
        }
    }

    get dataRetentionPolicyAsJson() {
        try {
            return JSON.parse(this.policy);
        } catch {
            return null;
        }
    }

    static schema = {
        name: 'General',
        primaryKey: 'id',
        properties: {
            id: 'string',
            currentChannel: 'Channel?',
            currentTeam: 'Team?',
            currentUser: 'User?',
            dataRetentionPolicy: 'string?',
            deviceToken: 'string?',
            serverConfig: 'string?',
            serverLicense: 'string?',
            serverVersion: 'string?',
        },
    }
}
