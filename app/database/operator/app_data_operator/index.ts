// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {buildAppInfoKey} from '@database/operator/app_data_operator/comparator';
import {transformInfoRecord, transformGlobalRecord} from '@database/operator/app_data_operator/transformers';
import BaseDataOperator from '@database/operator/base_data_operator';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import {logWarning} from '@utils/log';

import type {HandleInfoArgs, HandleGlobalArgs} from '@typings/database/database';

const {APP: {INFO, GLOBAL}} = MM_TABLES;

export default class AppDataOperator extends BaseDataOperator {
    handleInfo = async ({info, prepareRecordsOnly = true}: HandleInfoArgs) => {
        if (!info?.length) {
            logWarning(
                'An empty or undefined "info" array has been passed to the handleInfo',
            );
            return [];
        }

        return this.handleRecords({
            fieldName: 'version_number',
            buildKeyRecordBy: buildAppInfoKey,
            transformer: transformInfoRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: info, key: 'version_number'}),
            tableName: INFO,
        }, 'handleInfo');
    };

    handleGlobal = async ({globals, prepareRecordsOnly = true}: HandleGlobalArgs) => {
        if (!globals?.length) {
            logWarning(
                'An empty or undefined "globals" array has been passed to the handleGlobal',
            );
            return [];
        }

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformGlobalRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: globals, key: 'id'}),
            tableName: GLOBAL,
        }, 'handleGlobal');
    };
}
