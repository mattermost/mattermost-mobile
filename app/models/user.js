// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DEFAULT_LOCALE} from 'app/i18n';

export default class User {
    get notifyPropsAsJSON() {
        try {
            return JSON.parse(this.notifyProps);
        } catch {
            return null;
        }
    }

    get timezoneAsJson() {
        try {
            return JSON.parse(this.timezone);
        } catch {
            return null;
        }
    }

    get fullName() {
        return `${this.firstName.trim()} ${this.lastName.trim()}`;
    }

    static schema = {
        name: 'User',
        primaryKey: 'id',
        properties: {
            id: 'string',
            createAt: {type: 'int', indexed: true},
            updateAt: {type: 'int', indexed: true},
            deleteAt: {type: 'int', default: 0, indexed: true},
            username: {type: 'string', indexed: true},
            email: {type: 'string', indexed: true},
            nickname: {type: 'string', optional: true},
            firstName: {type: 'string', optional: true},
            lastName: {type: 'string', optional: true},
            roles: {type: 'string', optional: true},
            notifyProps: 'string?',
            locale: {type: 'string', default: DEFAULT_LOCALE},
            position: {type: 'string', optional: true},
            timezone: 'string?',
            lastPictureUpdate: 'int',
            status: {type: 'string', default: 'offline', indexed: true},
        },
    };
}
