// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {
    transformPropertyFieldRecord,
    transformPropertyValueRecord,
    transformBoardViewRecord,
} from '@database/operator/server_data_operator/transformers/boards';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import {logWarning} from '@utils/log';

import type ServerDataOperatorBase from '.';
import type Model from '@nozbe/watermelondb/Model';
import type {
    HandlePropertyFieldsArgs,
    HandlePropertyValuesArgs,
    HandleBoardViewsArgs,
} from '@typings/database/database';

const {PROPERTY_FIELD, PROPERTY_VALUE, BOARD_VIEW} = MM_TABLES.SERVER;

export interface BoardsHandlerMix {
    handleBoardViews: ({boardViews, prepareRecordsOnly}: HandleBoardViewsArgs) => Promise<Model[]>;
    handlePropertyFields: ({fields, prepareRecordsOnly}: HandlePropertyFieldsArgs) => Promise<Model[]>;
    handlePropertyValues: ({values, prepareRecordsOnly}: HandlePropertyValuesArgs) => Promise<Model[]>;
}

const BoardsHandler = <TBase extends Constructor<ServerDataOperatorBase>>(superclass: TBase) => class extends superclass {
    /**
     * handleBoardViews: Handler responsible for the Create/Update operations on the BoardView table.
     */
    handleBoardViews = async ({boardViews, prepareRecordsOnly = true}: HandleBoardViewsArgs): Promise<Model[]> => {
        if (!boardViews?.length) {
            logWarning('An empty or undefined "boardViews" array has been passed to the handleBoardViews method');
            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: boardViews, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformBoardViewRecord,
            createOrUpdateRawValues,
            tableName: BOARD_VIEW,
            prepareRecordsOnly,
        }, 'handleBoardViews');
    };

    /**
     * handlePropertyFields: Handler responsible for the Create/Update operations on the PropertyField table.
     */
    handlePropertyFields = async ({fields, prepareRecordsOnly = true}: HandlePropertyFieldsArgs): Promise<Model[]> => {
        if (!fields?.length) {
            logWarning('An empty or undefined "fields" array has been passed to the handlePropertyFields method');
            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: fields, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformPropertyFieldRecord,
            createOrUpdateRawValues,
            tableName: PROPERTY_FIELD,
            prepareRecordsOnly,
        }, 'handlePropertyFields');
    };

    /**
     * handlePropertyValues: Handler responsible for the Create/Update operations on the PropertyValue table.
     */
    handlePropertyValues = async ({values, prepareRecordsOnly = true}: HandlePropertyValuesArgs): Promise<Model[]> => {
        if (!values?.length) {
            logWarning('An empty or undefined "values" array has been passed to the handlePropertyValues method');
            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: values, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformPropertyValueRecord,
            createOrUpdateRawValues,
            tableName: PROPERTY_VALUE,
            prepareRecordsOnly,
        }, 'handlePropertyValues');
    };
};

export default BoardsHandler;
