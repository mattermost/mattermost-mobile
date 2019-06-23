// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export default class Users {
    get notifyPropsAsJSON() {
        try {
            return JSON.parse(this.notifyProps);
        } catch {
            return null;
        }
    }

    set notifyPropsFromJSON(props) {
        this.notifyProps = JSON.stringify(props);
    }

    get timezoneAsJson() {
        try {
            return JSON.parse(this.timezone);
        } catch {
            return null;
        }
    }

    set timezoneFromJson(zone) {
        this.timezone = JSON.stringify(zone);
    }

    get fullName() {
        return `${this.firstName.trim()} ${this.lastName.trim()}`;
    }

    static schema = {
        name: 'Users',
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
            locale: {type: 'string', default: 'en'},
            position: {type: 'string', optional: true},
            timezone: 'string?',
            status: {type: 'string', default: 'offline', indexed: true},
        },
    };
}
