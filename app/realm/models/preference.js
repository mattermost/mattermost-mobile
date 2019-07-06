// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Realm from 'realm';

export default class Preference extends Realm.Object {
    static schema = {
        name: 'Preference',
        primaryKey: 'id',
        properties: {
            id: 'string', // ${category}-${name}
            category: 'string',
            name: 'string',
            value: 'string',
        },
    }
}
