// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import {isRecordInfoEqualToRaw, isRecordGlobalEqualToRaw} from '@database/operator/app_data_operator/comparator';
import {transformInfoRecord, transformGlobalRecord} from '@database/operator/app_data_operator/transformers';
import BaseDataOperator from '@database/operator/base_data_operator';
import {getUniqueRawsBy} from '@database/operator/utils/general';

import type {HandleInfoArgs, HandleGlobalArgs} from '@typings/database/database';

const {APP: {INFO, GLOBAL}} = MM_TABLES;

export default class AppDataOperator extends BaseDataOperator {
    handleInfo = ({info, prepareRecordsOnly = true}: HandleInfoArgs) => {
        if (!info.length) {
            throw new DataOperatorException(
                'An empty "values" array has been passed to the handleInfo',
            );
        }

        return this.handleRecords({
            fieldName: 'version_number',
            findMatchingRecordBy: isRecordInfoEqualToRaw,
            transformer: transformInfoRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: info, key: 'version_number'}),
            tableName: INFO,
        });
    }

    handleGlobal = async ({global, prepareRecordsOnly = true}: HandleGlobalArgs) => {
        if (!global.length) {
            throw new DataOperatorException(
                'An empty "values" array has been passed to the handleGlobal',
            );
        }

        return this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordGlobalEqualToRaw,
            transformer: transformGlobalRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: global, key: 'id'}),
            tableName: GLOBAL,
        });
    }
}
