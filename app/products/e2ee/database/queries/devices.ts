// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {E2EE_TABLES} from '@e2ee/constants/database';
import {Q, type Database} from '@nozbe/watermelondb';

import type E2EERegisteredDeviceModel from '@e2ee/types/database/models/e2ee_registered_devices';

const {E2EE_REGISTERED_DEVICES} = E2EE_TABLES;

export const getCurrentDevice = async (database: Database): Promise<E2EERegisteredDeviceModel | undefined> => {
    const results = await database.get<E2EERegisteredDeviceModel>(E2EE_REGISTERED_DEVICES).query(
        Q.where('is_current_device', true),
    ).fetch();
    return results[0];
};
