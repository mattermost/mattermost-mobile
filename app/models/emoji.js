// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export default class Emoji {
    static schema = {
        name: 'Emoji',
        primaryKey: 'id',
        properties: {
            id: 'string',
            name: {type: 'string', indexed: true},
        },
    }
}
