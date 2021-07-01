// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import {
    isRecordInfoEqualToRaw,
    isRecordGlobalEqualToRaw,
    isRecordServerEqualToRaw,
} from '@database/operator/app_data_operator/comparator';
import {
    transformInfoRecord,
    transformGlobalRecord,
    transformServersRecord,
} from '@database/operator/app_data_operator/transformers';
import BaseDataOperator from '@database/operator/base_data_operator';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import {
    HandleInfoArgs,
    HandleGlobalArgs,
    HandleServersArgs,
} from '@typings/database/database';

const {APP: {INFO, GLOBAL, SERVERS}} = MM_TABLES;

export default class AppDataOperator extends BaseDataOperator {
    handleInfo = async ({info, prepareRecordsOnly = true}: HandleInfoArgs) => {
        if (!info.length) {
            throw new DataOperatorException(
                'An empty "values" array has been passed to the handleInfo',
            );
        }

        const records = await this.handleRecords({
            fieldName: 'version_number',
            findMatchingRecordBy: isRecordInfoEqualToRaw,
            transformer: transformInfoRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: info, key: 'version_number'}),
            tableName: INFO,
        });

        return records;
    }

    handleGlobal = async ({global, prepareRecordsOnly = true}: HandleGlobalArgs) => {
        if (!global.length) {
            throw new DataOperatorException(
                'An empty "values" array has been passed to the handleGlobal',
            );
        }

        const records = await this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordGlobalEqualToRaw,
            transformer: transformGlobalRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: global, key: 'id'}),
            tableName: GLOBAL,
        });

        return records;
    }

    handleServers = async ({servers, prepareRecordsOnly = true}: HandleServersArgs) => {
        if (!servers.length) {
            throw new DataOperatorException(
                'An empty "values" array has been passed to the handleServers',
            );
        }

        const records = await this.handleRecords({
            fieldName: 'url',
            findMatchingRecordBy: isRecordServerEqualToRaw,
            transformer: transformServersRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: servers, key: 'display_name'}),
            tableName: SERVERS,
        });

        return records;
    }
}
