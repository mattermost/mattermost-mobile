// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Realm from 'realm';

export class Team extends Realm.Object {
    static schema = {
        name: 'Team',
        primaryKey: 'id',
        properties: {
            id: 'string',
            createAt: 'int',
            updateAt: 'int',
            deleteAt: {type: 'int', default: 0},
            displayName: 'string',
            name: 'string',
            type: 'string',
            description: 'string?',
            groupConstrained: {type: 'bool', default: false},
            members: 'TeamMember[]',
        },
    }
}

export class TeamMember extends Realm.Object {
    get team() {
        if (this.teams?.length) {
            return this.teams[0];
        }

        return null;
    }

    static schema = {
        name: 'TeamMember',
        primaryKey: 'id', // the way we can update a nested object without having to specify the object to update we need a primary key
        properties: {
            id: 'string', // the primary key is {teamId}-{userId}
            teams: {type: 'linkingObjects', objectType: 'Team', property: 'members'},
            user: 'User',
            deleteAt: {type: 'int', default: 0},
            roles: 'string?',
            schemeUser: {type: 'bool', default: false},
            schemeAdmin: {type: 'bool', default: false},
            schemeGuest: {type: 'bool', default: false},
            msgCount: {type: 'int', default: 0},
            mentionCount: {type: 'int', default: 0},
        },
    }
}
