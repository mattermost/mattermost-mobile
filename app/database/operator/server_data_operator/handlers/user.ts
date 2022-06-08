// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {buildPreferenceKey} from '@database/operator/server_data_operator/comparators';
import {
    transformPreferenceRecord,
    transformUserRecord,
} from '@database/operator/server_data_operator/transformers/user';
import {getUniqueRawsBy} from '@database/operator/utils/general';

import type {
    HandlePreferencesArgs,
    HandleUsersArgs,
} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type UserModel from '@typings/database/models/servers/user';

const {PREFERENCE, USER} = MM_TABLES.SERVER;

export interface UserHandlerMix {
    handlePreferences: ({preferences, prepareRecordsOnly}: HandlePreferencesArgs) => Promise<PreferenceModel[]>;
    handleUsers: ({users, prepareRecordsOnly}: HandleUsersArgs) => Promise<UserModel[]>;
}

const UserHandler = (superclass: any) => class extends superclass {
    /**
     * handlePreferences: Handler responsible for the Create/Update operations occurring on the PREFERENCE table from the 'Server' schema
     * @param {HandlePreferencesArgs} preferencesArgs
     * @param {PreferenceType[]} preferencesArgs.preferences
     * @param {boolean} preferencesArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<PreferenceModel[]>}
     */
    handlePreferences = async ({preferences, prepareRecordsOnly = true, sync = false}: HandlePreferencesArgs): Promise<PreferenceModel[]> => {
        if (!preferences?.length) {
            // eslint-disable-next-line no-console
            console.warn(
                'An empty or undefined "preferences" array has been passed to the handlePreferences method',
            );
            return [];
        }

        // WE NEED TO SYNC THE PREFS FROM WHAT WE GOT AND WHAT WE HAVE
        const deleteValues: PreferenceModel[] = [];
        const stored = await this.database.get(PREFERENCE).query().fetch() as PreferenceModel[];
        const preferenesMap = new Map(stored.map((p) => {
            return [`${p.category}-${p.name}`, p];
        }));
        if (sync) {
            for (const pref of stored) {
                const exists = preferenesMap.get(`${pref.category}-${pref.name}`);
                if (!exists) {
                    pref.prepareDestroyPermanently();
                    deleteValues.push(pref);
                }
            }
        }

        const createOrUpdateRawValues = preferences.reduce((res: PreferenceType[], p) => {
            const id = `${p.category}-${p.name}`;
            const exist = preferenesMap.get(id);
            if (!exist) {
                res.push(p);
                return res;
            }

            if (p.category !== exist.category || p.name !== exist.name || p.value !== exist.value) {
                res.push(p);
            }

            return res;
        }, []);

        if (!createOrUpdateRawValues.length) {
            return [];
        }

        const records: PreferenceModel[] = await this.handleRecords({
            fieldName: 'user_id',
            buildKeyRecordBy: buildPreferenceKey,
            transformer: transformPreferenceRecord,
            prepareRecordsOnly: true,
            createOrUpdateRawValues,
            tableName: PREFERENCE,
        });

        if (deleteValues.length) {
            records.push(...deleteValues);
        }

        if (records.length && !prepareRecordsOnly) {
            await this.batchRecords(records);
        }

        return records;
    };

    /**
     * handleUsers: Handler responsible for the Create/Update operations occurring on the User table from the 'Server' schema
     * @param {HandleUsersArgs} usersArgs
     * @param {UserProfile[]} usersArgs.users
     * @param {boolean} usersArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<UserModel[]>}
     */
    handleUsers = async ({users, prepareRecordsOnly = true}: HandleUsersArgs): Promise<UserModel[]> => {
        if (!users?.length) {
            // eslint-disable-next-line no-console
            console.warn(
                'An empty or undefined "users" array has been passed to the handleUsers method',
            );
            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: users, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformUserRecord,
            createOrUpdateRawValues,
            tableName: USER,
            prepareRecordsOnly,
        });
    };
};

export default UserHandler;
