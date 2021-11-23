// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';
import {OperationType} from '@typings/database/enums';

import type {TransformerArgs} from '@typings/database/database';
import type CategoryModel from '@typings/database/models/servers/category';

const {
    CATEGORY,
} = MM_TABLES.SERVER;

/**
 * transformCategoryRecord: Prepares a record of the SERVER database 'Category' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<CategoryModel>}
 */
export const transformCategoryRecord = ({action, database, value}: TransformerArgs): Promise<CategoryModel> => {
    const raw = value.raw as Category & {sort_order: number};
    const record = value.record as CategoryModel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (category: CategoryModel) => {
        category._raw.id = isCreateAction ? (raw?.id ?? category.id) : record.id;
        category.displayName = raw.display_name;
        category.type = raw.type;
        category.teamId = raw.team_id;
        category.userId = raw.user_id;
        category.collapsed = isCreateAction ? false : record.collapsed; // Collapsed should always be local
        category.sortOrder = raw.sort_order;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: CATEGORY,
        value,
        fieldsMapper,
    }) as Promise<CategoryModel>;
};

