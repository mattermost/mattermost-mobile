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
    transformAppRecord,
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
                `An empty "values" array has been passed to the handleIsolatedEntity method for entity ${INFO}`,
            );
        }

        const records = await this.handleEntityRecords({
            fieldName: 'version_number',
            findMatchingRecordBy: isRecordInfoEqualToRaw,
            transformer: transformAppRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: info, key: 'version_number'}),
            tableName: INFO,
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
            tableName: SERVERS,
        });

        return records;
    }
}
