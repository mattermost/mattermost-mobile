// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type PreferenceModel from '@typings/database/models/servers/preference';

export const prepareMyPreferences = (operator: ServerDataOperator, preferences: PreferenceType[]) => {
    try {
        return operator.handlePreferences({
            prepareRecordsOnly: true,
            preferences,
        });
    } catch {
        return undefined;
    }
};

export const queryPreferencesByCategoryAndName = (database: Database, category: string, name: string) => {
    return database.get(MM_TABLES.SERVER.PREFERENCE).query(
        Q.where('category', category),
        Q.where('name', name),
    ).fetch() as Promise<PreferenceModel[]>;
};
