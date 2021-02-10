// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DataOperator, {OperationType} from './index';

const {APP} = MM_TABLES.DEFAULT;

// const {CUSTOM_EMOJI, ROLE, SYSTEM, TERMS_OF_SERVICE} = MM_TABLES.SERVER;

export const runDataOperatorTests = async () => {
    const createRecord = async () => {
        await DataOperator.handleIsolatedEntityData({
            optType: OperationType.CREATE,
            tableName: APP,
            values: {buildNumber: 'build-7', createdAt: 1, id: 'id-7', versionNumber: 'version-7'},
        });
    };

    const createRecords = async () => {
        await DataOperator.handleIsolatedEntityData({
            optType: OperationType.CREATE,
            tableName: APP,
            values: [

                // {buildNumber: 'build-8', createdAt: 1, id: 'id-8', versionNumber: 'version-8'},
                // {buildNumber: 'build-9', createdAt: 1, id: 'id-9', versionNumber: 'version-9'},
                {buildNumber: 'build-10', createdAt: 1, id: 'id-10', versionNumber: 'version-10'},
                {buildNumber: 'build-11', createdAt: 1, id: 'id-11', versionNumber: 'version-11'},
                {buildNumber: 'build-12', createdAt: 1, id: 'id-12', versionNumber: 'version-12'},
                {buildNumber: 'build-13', createdAt: 1, id: 'id-13', versionNumber: 'version-13'},
            ],
        });
    };

    const updateRecord = async () => {
        await DataOperator.handleIsolatedEntityData({
            optType: OperationType.UPDATE,
            tableName: APP,
            values: {buildNumber: 'build-13-13', createdAt: 1, id: 'id-13', versionNumber: 'version-13'},

        });
    };

    const updateRecords = async () => {
        await DataOperator.handleIsolatedEntityData({
            optType: OperationType.UPDATE,
            tableName: APP,
            values: [
                {buildNumber: 'build-8a', createdAt: 1, id: 'id-8a', versionNumber: 'version-8aa'},
                {buildNumber: 'build-9x', createdAt: 1, id: 'id-9', versionNumber: 'version-9'},
                {buildNumber: 'build-10yyy', createdAt: 1, id: 'id-10', versionNumber: 'version-10x'},
            ],
        });
    };

    await createRecord();

    await createRecords();

    await updateRecord();

    await updateRecords();
};
