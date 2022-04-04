// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import {
    transformCategoryChannelRecord,
    transformCategoryRecord,
} from '@database/operator/server_data_operator/transformers/category';
import {getUniqueRawsBy} from '@database/operator/utils/general';

import type {
    HandleCategoryChannelArgs,
    HandleCategoryArgs,
} from '@typings/database/database';
import type CategoryModel from '@typings/database/models/servers/category';
import type CategoryChannelModel from '@typings/database/models/servers/category_channel';

const {
    CATEGORY,
    CATEGORY_CHANNEL,
} = MM_TABLES.SERVER;

export interface CategoryHandlerMix {
    handleCategoryChannels: ({categoryChannels, prepareRecordsOnly}: HandleCategoryChannelArgs) => Promise<CategoryChannelModel[]>;
    handleCategories: ({categories, prepareRecordsOnly}: HandleCategoryArgs) => Promise<CategoryModel[]>;
}

const CategoryHandler = (superclass: any) => class extends superclass {
    /**
     * handleCategories: Handler responsible for the Create/Update operations occurring on the Category table from the 'Server' schema
     * @param {HandleCategoryArgs} categoriesArgs
     * @param {Category[]} categoriesArgs.categories
     * @param {boolean} categoriesArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<CategoryModel[]>}
     */
    handleCategories = async ({categories, prepareRecordsOnly = true}: HandleCategoryArgs): Promise<CategoryModel[]> => {
        if (!categories.length) {
            throw new DataOperatorException(
                'An empty "categories" array has been passed to the handleCategories method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: categories, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformCategoryRecord,
            createOrUpdateRawValues,
            tableName: CATEGORY,
            prepareRecordsOnly,
        });
    };

    /**
     * handleCategoryChannels: Handler responsible for the Create/Update operations occurring on the CategoryChannel table from the 'Server' schema
     * @param {HandleCategoryChannelArgs} categoriesArgs
     * @param {CategoryChannel[]} categoriesArgs.categorychannels
     * @param {boolean} categoriesArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<CategoryChannelModel[]>}
     */
    handleCategoryChannels = async ({categoryChannels, prepareRecordsOnly = true}: HandleCategoryChannelArgs): Promise<CategoryModel[]> => {
        if (!categoryChannels.length) {
            throw new DataOperatorException(
                'An empty "categoryChannels" array has been passed to the handleCategories method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: categoryChannels, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformCategoryChannelRecord,
            createOrUpdateRawValues,
            tableName: CATEGORY_CHANNEL,
            prepareRecordsOnly,
        });
    };
};

export default CategoryHandler;
