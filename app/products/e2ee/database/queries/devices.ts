// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {E2EE_TABLES} from '@e2ee/constants/database';
import {Q, type Database} from '@nozbe/watermelondb';

import type E2EEEnabledDeviceModel from '@e2ee/types/database/models/e2ee_enabled_devices';

const {E2EE_ENABLED_DEVICES} = E2EE_TABLES;

export const queryEnabledDevices = (database: Database) => {
    return database.get<E2EEEnabledDeviceModel>(E2EE_ENABLED_DEVICES).query(
        Q.sortBy('is_current_device', Q.desc),
        Q.sortBy('created_at', Q.desc),
    );
};

export const observeEnabledDevices = (database: Database) => {
    return queryEnabledDevices(database).observeWithColumns(['is_current_device', 'created_at', 'last_active_at', 'device_name', 'verified']);
};
