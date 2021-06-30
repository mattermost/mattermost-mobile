// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {Database, Q} from '@nozbe/watermelondb';
import Preference from '@typings/database/models/servers/preference';

const {SERVER: {PREFERENCE}} = MM_TABLES;

export const getThemeForUser = async (serverDatabase: Database, userId: string): Promise<Theme | undefined> => {
    try {
        const themes = (await serverDatabase.collections.get(PREFERENCE).query(Q.where('user_id', userId), Q.where('category', 'theme')).fetch()) as Preference[];
        const theme = JSON.parse(themes?.[0].value);
        return theme;
    } catch (e) {
        console.error('Unable to retrieve theme for user '); // eslint-disable-line no-console
    }
    return undefined;
};
