// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';

import type InfoModel from '@typings/database/models/app/info';

const {APP: {INFO}} = MM_TABLES;

export const getLastInstalledVersion = async () => {
    try {
        const {database} = DatabaseManager.getAppDatabaseAndOperator();
        const infos = await database.get<InfoModel>(INFO).query(
            Q.sortBy('created_at', Q.desc),
            Q.take(1),
        ).fetch();
        return infos[0];
    } catch {
        return undefined;
    }
};
