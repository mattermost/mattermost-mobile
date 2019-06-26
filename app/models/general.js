// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export default class General {
    get configAsJson() {
        try {
            return JSON.parse(this.config);
        } catch {
            return null;
        }
    }

    set configFromJson(config) {
        this.config = JSON.stringify(config);
    }

    get licenseAsJson() {
        try {
            return JSON.parse(this.license);
        } catch {
            return null;
        }
    }

    set licenseFromJson(license) {
        this.license = JSON.stringify(license);
    }

    get dataRetentionPolicyAsJson() {
        try {
            return JSON.parse(this.policy);
        } catch {
            return null;
        }
    }

    set dataRetentionPolicyFromJson(policy) {
        this.policy = JSON.stringify(policy);
    }

    static schema = {
        name: 'General',
        primaryKey: 'id',
        properties: {
            id: 'string', // make this id a constant in code
            currentChannel: 'Channels?',
            currentTeam: 'Teams?',
            currentUser: 'Users?',
            dataRetentionPolicy: 'string?',
            deviceToken: 'string?',
            serverConfig: 'string?',
            serverLicense: 'string?',
            serverVersion: 'string?',
        },
    }
}
