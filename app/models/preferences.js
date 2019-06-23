// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export default class Preferences {
    static schema = {
        name: 'Preferences',
        properties: {
            category: 'string',
            name: 'string',
            value: 'string',
        },
    }
}
