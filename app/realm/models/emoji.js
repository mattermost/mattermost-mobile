// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Realm from 'realm';

export class Emoji extends Realm.Object {
    static schema = {
        name: 'Emoji',
        primaryKey: 'id',
        properties: {
            id: 'string',
            name: {type: 'string', indexed: true},
        },
    };
}

export class NonExistentEmoji extends Realm.Object {
    static schema = {
        name: 'NonExistentEmoji',
        primary: 'name',
        properties: {
            name: 'string',
        },
    };
}
