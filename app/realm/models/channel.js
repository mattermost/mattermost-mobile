// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Realm from 'realm';

export class Channel extends Realm.Object {
    snapshot = () => {
        return {
            ...this,
        };
    };

    static schema = {
        name: 'Channel',
        primaryKey: 'id',
        properties: {
            id: 'string',
            createAt: 'int',
            updateAt: 'int',
            deleteAt: {type: 'int', default: 0},
            creatorId: 'string?',
            team: 'Team?',
            type: {type: 'string', indexed: true},
            displayName: {type: 'string', default: ''},
            name: 'string',
            header: 'string?',
            lastPostAt: {type: 'int', default: 0},
            totalMsgCount: {type: 'int', default: 0},
            purpose: 'string?',
            groupConstrained: {type: 'bool', default: false},
            members: 'ChannelMember[]',
            memberCount: {type: 'int', default: 0},
            guestCount: {type: 'int', default: 0},
            pinnedCount: {type: 'int', default: 0},
        },
    }
}

export class ChannelMember extends Realm.Object {
    get channel() {
        if (this.channels?.length) {
            return this.channel[0];
        }

        return null;
    }

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

    snapshot = () => {
        return {
            ...this,
        };
    };

    static schema = {
        name: 'ChannelMember',
        primaryKey: 'id',
        properties: {
            id: 'string', // ${channelId}-{$userId},
            channels: {type: 'linkingObjects', objectType: 'Channel', property: 'members'},
            user: 'User',
            roles: 'string?',
            lastViewAt: {type: 'int', default: 0},
            lastUpdateAt: {type: 'int', default: 0},
            msgCount: {type: 'int', default: 0},
            mentionCount: {type: 'int', default: 0},
            notifyProps: 'string?',
            schemeUser: {type: 'bool', default: true},
            schemeAdmin: {type: 'bool', default: false},
            schemeGuest: {type: 'bool', default: false},
        },
    }
}
