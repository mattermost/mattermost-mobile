// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export class Channel {
    static schema = {
        name: 'Channel',
        primaryKey: 'id',
        properties: {
            id: 'string',
            createAt: 'int',
            updateAt: 'int',
            deleteAt: {type: 'int', default: 0},
            team: 'Team',
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
        },
    }
}

export class ChannelMember {
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

    static schema = {
        name: 'ChannelMember',
        primaryKey: 'id',
        properties: {
            id: 'string', // ${channelId}-{$userId},
            channels: {type: 'linkingObjects', objectType: 'Channel', property: 'members'},
            user: 'User',
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
