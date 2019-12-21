// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Realm from 'realm';

export default class ClientUpgrade extends Realm.Object {
    static schema = {
        name: 'ClientUpgrade',
        primary: 'id',
        properties: {
            id: 'string',
            lastUpdateCheck: 'date',
        },
    };
}