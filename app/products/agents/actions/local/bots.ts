// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

export const clearAIBots = async (serverUrl: string) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleAIBots({bots: [], prepareRecordsOnly: false});
        return {data: true};
    } catch (error) {
        logError('[clearAIBots]', getFullErrorMessage(error));
        return {error};
    }
};
