// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export class Channels {
    static schema = {
        name: 'Channels',
        primaryKey: 'id',
        properties: {
            id: 'string',
            createAt: 'int',
            updateAt: 'int',
            deleteAt: {type: 'int', default: 0},
            team: 'Teams',
            type: {type: 'string', indexed: true},
            displayName: 'string?',
            name: 'string',
            header: 'string?',
            lastPostAt: {type: 'int', default: 0},
            totalMsgCount: {type: 'int', default: 0},
            purpose: 'string?',
            groupConstrained: {type: 'bool', default: false},
            members: 'ChannelMembers[]',
            memberCount: {type: 'int', default: 0},
        },
    }
}

export class ChannelMembers {
    get channel() {
        if (this.channel?.length) {
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

    static schema = {
        name: 'ChannelMembers',
        primaryKey: 'id',
        properties: {
            id: 'string', // ${channelId}-{$userId},
            channels: {type: 'linkingObjects', objectType: 'Channels', property: 'members'},
            user: 'Users',
            roles: 'string?',
            lastViewAt: {type: 'int', default: 0},
            msgCount: {type: 'int', default: 0},
            mentionCount: {type: 'int', default: 0},
            notifyProps: 'string?',
            schemeUser: {type: 'bool', default: true},
            schemeAdmin: {type: 'bool', default: false},
            schemeGuest: {type: 'bool', default: false},
        },
    }
}
