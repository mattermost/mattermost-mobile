// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {E2EE_TABLES} from '@e2ee/constants/database';
import {tableSchema} from '@nozbe/watermelondb';

const {E2EE_ENABLED_DEVICES} = E2EE_TABLES;

export default tableSchema({
    name: E2EE_ENABLED_DEVICES,
    columns: [
        {name: 'device_id', type: 'string'},
        {name: 'device_name', type: 'string'},
        {name: 'signature_public_key', type: 'string', isOptional: true},
        {name: 'is_current_device', type: 'boolean'},
        {name: 'created_at', type: 'number'},
        {name: 'last_active_at', type: 'number', isOptional: true},
        {name: 'revoke_at', type: 'number', isOptional: true},
        {name: 'os_version', type: 'string', isOptional: true},
        {name: 'app_version', type: 'string', isOptional: true},
        {name: 'verified', type: 'boolean'},
    ],
});
