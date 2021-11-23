// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import {isRecordCategoryEqualToRaw} from '@database/operator/server_data_operator/comparators';
import {getUniqueRawsBy} from '@database/operator/utils/general';

import {transformCategoryRecord} from '../transformers/category';

import type {HandleCategoryArgs} from '@typings/database/database';
import type CategoryModel from '@typings/database/models/servers/category';

const {
    CATEGORY,
} = MM_TABLES.SERVER;

export interface CategoryHandlerMix {
    handleCategory: ({categories, prepareRecordsOnly}: HandleCategoryArgs) => Promise<CategoryModel[]>;
}

const CategoryHandler = (superclass: any) => class extends superclass {
    /**
     * handleCategory: Handler responsible for the Create/Update operations occurring on the Category table from the 'Server' schema
     * @param {HandleCategoryArgs} categoryArgs
     * @param {Category[]} categoryArgs.categories
     * @param {boolean} categoryArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<CategoryModel[]>}
     */
    handleCategory = async ({categories, prepareRecordsOnly = true}: HandleCategoryArgs): Promise<CategoryModel[]> => {
        if (!categories) {
            throw new DataOperatorException(
                'An empty "categories" object has been passed to the handleCategory method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: categories.categories, key: 'id'});

        createOrUpdateRawValues.forEach((raw: Category & {sort_order: number}) => {
            // Add sort order to the categories
            raw.sort_order = categories.order.findIndex((categoryId) => categoryId === raw.id);
        });

        return this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordCategoryEqualToRaw,
            transformer: transformCategoryRecord,
            createOrUpdateRawValues,
            tableName: CATEGORY,
            prepareRecordsOnly,
        });
    };
};

export default CategoryHandler;
