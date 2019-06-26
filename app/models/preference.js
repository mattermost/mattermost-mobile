// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export default class Preference {
    static schema = {
        name: 'Preference',
        properties: {
            category: 'string',
            name: 'string',
            value: 'string',
        },
    }
}
