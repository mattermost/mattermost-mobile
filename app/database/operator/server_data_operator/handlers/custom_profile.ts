// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {
    transformCustomProfileFieldRecord,
    transformCustomProfileAttributeRecord,
} from '@database/operator/server_data_operator/transformers/custom_profile';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import {deleteCustomProfileAttributesByFieldId} from '@queries/servers/custom_profile';
import {logError, logWarning} from '@utils/log';

import type ServerDataOperatorBase from '.';
import type Model from '@nozbe/watermelondb/Model';
import type {
    HandleCustomProfileFieldsArgs,
    HandleCustomProfileAttributesArgs,
} from '@typings/database/database';

const {CUSTOM_PROFILE_FIELD, CUSTOM_PROFILE_ATTRIBUTE} = MM_TABLES.SERVER;

export interface CustomProfileHandlerMix {
    handleCustomProfileFields: ({fields, prepareRecordsOnly}: HandleCustomProfileFieldsArgs) => Promise<Model[]>;
    handleCustomProfileAttributes: ({attributes, prepareRecordsOnly}: HandleCustomProfileAttributesArgs) => Promise<Model[]>;
}
const CustomProfileHandler = <TBase extends Constructor<ServerDataOperatorBase>>(superclass: TBase) => class extends superclass {
    /**
     * handleCustomProfileFields: Handler responsible for the Create/Update operations occurring on the CUSTOM_PROFILE_FIELD table from the 'Server' schema
     * @param {HandleCustomProfileFieldsArgs} fieldsArgs
     * @param {CustomProfileField[]} fieldsArgs.fields
     * @param {boolean} fieldsArgs.prepareRecordsOnly
     * @returns {Promise<Model[]>}
     */
    handleCustomProfileFields = async ({fields, prepareRecordsOnly = true}: HandleCustomProfileFieldsArgs): Promise<Model[]> => {
        if (!fields?.length) {
            logWarning(
                'An empty or undefined "fields" array has been passed to the handleCustomProfileFields method',
            );
            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: fields, key: 'id'});
        try {
            const deletedFields = fields.filter((field) => field.delete_at !== 0).map((field) => deleteCustomProfileAttributesByFieldId(this.database, field.id));
            await Promise.all(deletedFields);
        } catch (error) {
            logError('Error deleting custom profile attributes by field id', error);
        }

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformCustomProfileFieldRecord,
            createOrUpdateRawValues,
            tableName: CUSTOM_PROFILE_FIELD,
            prepareRecordsOnly,
        }, 'handleCustomProfileFields');
    };

    /**
     * handleCustomProfileAttributes: Handler responsible for the Create/Update operations occurring on the CUSTOM_PROFILE_ATTRIBUTE table from the 'Server' schema
     * @param {HandleCustomProfileAttributesArgs} attributesArgs
     * @param {CustomProfileAttributeSimple[]} attributesArgs.attributes
     * @param {boolean} attributesArgs.prepareRecordsOnly
     * @returns {Promise<Model[]>}
     */
    handleCustomProfileAttributes = async ({attributes, prepareRecordsOnly = true}: HandleCustomProfileAttributesArgs): Promise<Model[]> => {
        if (!attributes?.length) {
            logWarning(
                'An empty or undefined "attributes" array has been passed to the handleCustomProfileAttributes method',
            );
            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: attributes, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformCustomProfileAttributeRecord,
            createOrUpdateRawValues,
            tableName: CUSTOM_PROFILE_ATTRIBUTE,
            prepareRecordsOnly,
        }, 'handleCustomProfileAttributes');
    };
};

export default CustomProfileHandler;
