// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';

import type Model from '@nozbe/watermelondb/Model';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

type UpdateUserCustomStatusArgs = {
    status?: UserCustomStatus;
    user: UserModel;
    recentCustomStatuses: {
        record: SystemModel;
        statuses: UserCustomStatus[];
    };
    serverUrl: string;
}
export const updateLocalCustomStatus = async ({status, user, recentCustomStatuses, serverUrl}: UpdateUserCustomStatusArgs) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;

    try {
        let models: Model[] = [];

        const currentProps = {...user.props, customStatus: status ? {...status} : {}};
        const userModel = user.prepareUpdate((u: UserModel) => {
            u.props = currentProps;
        });

        models.push(userModel);

        if (status) {
            const rcst = recentCustomStatuses.statuses;
            rcst.unshift(status);

            const systemModels: Model[] = await operator?.handleSystem({prepareRecordsOnly: true, systems: [{id: SYSTEM_IDENTIFIERS.RECENT_CUSTOM_STATUS, value: JSON.stringify(rcst)}]});
            if (systemModels.length) {
                models = models.concat(systemModels);
            }
        }
        await operator?.batchRecords(models);
    } catch (e) {
        //todo: do something about that error ? Emit an error ?
    }
};
