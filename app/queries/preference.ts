// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import Preference from '@typings/database/preference';

export const getTheme = async (database: Database) => {
    const userTheme = await database.collections.get(MM_TABLES.SERVER.PREFERENCE).query(Q.where('category', 'theme')).fetch() as Preference[];
    if (userTheme?.[0]) {
        return userTheme[0].value;
    }
    return null;
};
