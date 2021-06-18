// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import {App} from '@database/models/default';
import {
    isRecordAppEqualToRaw,
    isRecordGlobalEqualToRaw,
    isRecordServerEqualToRaw,
} from '@database/operator/app_data_operator/comparator';
import {
    transformAppRecord,
    transformGlobalRecord,
    transformServersRecord,
} from '@database/operator/app_data_operator/transformers';
import BaseDataOperator, {BaseDataOperatorType} from '@database/operator/base_data_operator';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import {
    HandleAppArgs,
    HandleCustomEmojiArgs,
    HandleGlobalArgs,
    HandleServersArgs,
} from '@typings/database/database';
import Servers from '@typings/database/servers';

const {DEFAULT: {APP, GLOBAL, SERVERS}} = MM_TABLES;

export interface ServerDataOperatorMix extends BaseDataOperatorType {
    handleApp : (args: HandleAppArgs) => Promise<App[]>,
    handleGlobal : (args: HandleCustomEmojiArgs) => Promise<HandleGlobalArgs[]>,
    handleServers : (args: HandleServersArgs) => Promise<Servers[]>,
}

export default class AppDataOperator extends BaseDataOperator {
    handleApp = async ({app, prepareRecordsOnly = true}: HandleAppArgs) => {
        if (!app.length) {
            throw new DataOperatorException(
                `An empty "values" array has been passed to the handleIsolatedEntity method for entity ${APP}`,
            );
        }

        const records = await this.handleEntityRecords({
            fieldName: 'version_number',
            findMatchingRecordBy: isRecordAppEqualToRaw,
            transformer: transformAppRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: app, key: 'version_number'}),
            deleteRawValues: [],
            tableName: APP,
        });

        return records;
    }

    handleGlobal = async ({global, prepareRecordsOnly = true}: HandleGlobalArgs) => {
        if (!global.length) {
            throw new DataOperatorException(
                `An empty "values" array has been passed to the handleIsolatedEntity method for entity ${GLOBAL}`,
            );
        }

        const records = await this.handleEntityRecords({
            fieldName: 'name',
            findMatchingRecordBy: isRecordGlobalEqualToRaw,
            transformer: transformGlobalRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: global, key: 'name'}),
            deleteRawValues: [],
            tableName: GLOBAL,
        });

        return records;
    }

    handleServers = async ({servers, prepareRecordsOnly = true}: HandleServersArgs) => {
        if (!servers.length) {
            throw new DataOperatorException(
                `An empty "values" array has been passed to the handleIsolatedEntity method for entity ${SERVERS}`,
            );
        }

        const records = await this.handleEntityRecords({
            fieldName: 'url',
            findMatchingRecordBy: isRecordServerEqualToRaw,
            transformer: transformServersRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: servers, key: 'display_name'}),
            deleteRawValues: [],
            tableName: SERVERS,
        });

        return records;
    }
}
