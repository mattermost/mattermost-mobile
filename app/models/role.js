// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export class Role {
    static schema = {
        name: 'Role',
        primaryKey: 'id',
        properties: {
            id: 'string',
            name: {type: 'string', indexed: true},
            displayName: 'string',
            description: 'string',
            creatAt: 'int',
            updateAt: 'int',
            deleteAt: {type: 'int', default: 0},
            schemeManaged: 'bool',
            builtIn: 'bool',
        },
    }
}
