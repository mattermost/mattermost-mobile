// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {buildPreferenceKey} from '@database/operator/server_data_operator/comparators';
import {shouldUpdateUserRecord} from '@database/operator/server_data_operator/comparators/user';
import {
    transformPreferenceRecord,
    transformUserRecord,
} from '@database/operator/server_data_operator/transformers/user';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import {filterPreferences} from '@helpers/api/preference';
import {logWarning} from '@utils/log';

import type ServerDataOperatorBase from '.';
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

const UserHandler = <TBase extends Constructor<ServerDataOperatorBase>>(superclass: TBase) => class extends superclass {
    /**
     * handlePreferences: Handler responsible for the Create/Update operations occurring on the PREFERENCE table from the 'Server' schema
     * @param {HandlePreferencesArgs} preferencesArgs
     * @param {PreferenceType[]} preferencesArgs.preferences
     * @param {boolean} preferencesArgs.prepareRecordsOnly
     * @returns {Promise<PreferenceModel[]>}
     */
    handlePreferences = async ({preferences, prepareRecordsOnly = true, sync = false}: HandlePreferencesArgs): Promise<PreferenceModel[]> => {
        const records: PreferenceModel[] = [];

        if (!preferences?.length) {
            logWarning(
                'An empty or undefined "preferences" array has been passed to the handlePreferences method',
            );
            return records;
        }

        const filtered = filterPreferences(preferences);

        // WE NEED TO SYNC THE PREFS FROM WHAT WE GOT AND WHAT WE HAVE
        const deleteValues: PreferenceModel[] = [];
        const stored = await this.database.get(PREFERENCE).query().fetch() as PreferenceModel[];
        const storedPreferencesMap = new Map(stored.map((p) => {
            return [`${p.category}-${p.name}`, p];
        }));
        if (sync) {
            const rawPreferencesMap = new Map(filtered.map((p) => [`${p.category}-${p.name}`, p]));
            for (const pref of stored) {
                const exists = rawPreferencesMap.get(`${pref.category}-${pref.name}`);
                if (!exists) {
                    pref.prepareDestroyPermanently();
                    deleteValues.push(pref);
                }
            }
        }

        const createOrUpdateRawValues = filtered.reduce((res: PreferenceType[], p) => {
            const id = `${p.category}-${p.name}`;
            const exist = storedPreferencesMap.get(id);
            if (!exist) {
                res.push(p);
                return res;
            }

            if (p.category !== exist.category || p.name !== exist.name || p.value !== exist.value) {
                res.push(p);
            }

            return res;
        }, []);

        if (!createOrUpdateRawValues.length && !deleteValues.length) {
            return records;
        }

        if (createOrUpdateRawValues.length) {
            const createOrUpdate: PreferenceModel[] = await this.handleRecords({
                fieldName: 'user_id',
                buildKeyRecordBy: buildPreferenceKey,
                transformer: transformPreferenceRecord,
                prepareRecordsOnly: true,
                createOrUpdateRawValues,
                tableName: PREFERENCE,
            }, 'handlePreferences(NEVER)');
            records.push(...createOrUpdate);
        }

        if (deleteValues.length) {
            records.push(...deleteValues);
        }

        if (records.length && !prepareRecordsOnly) {
            await this.batchRecords(records, 'handlePreferences');
        }

        return records;
    };

    /**
     * handleUsers: Handler responsible for the Create/Update operations occurring on the User table from the 'Server' schema
     * @param {HandleUsersArgs} usersArgs
     * @param {UserProfile[]} usersArgs.users
     * @param {boolean} usersArgs.prepareRecordsOnly
     * @returns {Promise<UserModel[]>}
     */
    handleUsers = async ({users, prepareRecordsOnly = true}: HandleUsersArgs): Promise<UserModel[]> => {
        if (!users?.length) {
            logWarning(
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
            shouldUpdate: shouldUpdateUserRecord,
        }, 'handleUsers');
    };
};

export default UserHandler;
