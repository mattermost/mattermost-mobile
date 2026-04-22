// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {
    transformPropertyFieldRecord,
    transformPropertyValueRecord,
    transformViewRecord,
} from '@database/operator/server_data_operator/transformers/boards';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import {logWarning} from '@utils/log';

import type ServerDataOperatorBase from '.';
import type Model from '@nozbe/watermelondb/Model';
import type {
    HandlePropertyFieldsArgs,
    HandlePropertyValuesArgs,
    HandleViewsArgs,
} from '@typings/database/database';

const {PROPERTY_FIELD, PROPERTY_VALUE, VIEW} = MM_TABLES.SERVER;

export interface BoardsHandlerMix {
    handleViews: ({views, prepareRecordsOnly}: HandleViewsArgs) => Promise<Model[]>;
    handlePropertyFields: ({fields, prepareRecordsOnly}: HandlePropertyFieldsArgs) => Promise<Model[]>;
    handlePropertyValues: ({values, prepareRecordsOnly}: HandlePropertyValuesArgs) => Promise<Model[]>;
}

const BoardsHandler = <TBase extends Constructor<ServerDataOperatorBase>>(superclass: TBase) => class extends superclass {
    /**
     * handleViews: Handler responsible for the Create/Update operations on the BoardView table.
     */
    handleViews = async ({views, prepareRecordsOnly = true}: HandleViewsArgs): Promise<Model[]> => {
        if (!views?.length) {
            logWarning('An empty or undefined "views" array has been passed to the handleViews method');
            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: views, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformViewRecord,
            createOrUpdateRawValues,
            tableName: VIEW,
            prepareRecordsOnly,
        }, 'handleViews');
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
