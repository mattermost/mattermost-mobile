// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Realm from 'realm';

export default class Emoji extends Realm.Object {
    static schema = {
        name: 'Emoji',
        primaryKey: 'id',
        properties: {
            id: 'string',
            name: {type: 'string', indexed: true},
        },
    }
}
