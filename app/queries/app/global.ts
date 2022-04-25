// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {GLOBAL_IDENTIFIERS, MM_TABLES} from '@constants/database';

import type Global from '@typings/database/models/app/global';

const {APP: {GLOBAL}} = MM_TABLES;

export const getDeviceToken = async (appDatabase: Database): Promise<string> => {
    try {
        const tokens = await appDatabase.get<Global>(GLOBAL).find(GLOBAL_IDENTIFIERS.DEVICE_TOKEN);
        return tokens?.value || '';
    } catch {
        return '';
    }
};
