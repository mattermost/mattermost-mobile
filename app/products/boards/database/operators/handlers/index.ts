// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BOARDS_TABLES} from '@boards/constants/database';
import {transformBoardViewRecord} from '@boards/database/operators/transformers';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import {logWarning} from '@utils/log';

import type ServerDataOperatorBase from '@database/operator/server_data_operator/handlers';
import type Model from '@nozbe/watermelondb/Model';

type HandleBoardViewsArgs = {
    prepareRecordsOnly: boolean;
    boardViews?: BoardView[];
}

const {BOARD_VIEW} = BOARDS_TABLES;

export interface BoardsHandlerMix {
    handleBoardViews: (args: HandleBoardViewsArgs) => Promise<Model[]>;
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
};

export default BoardsHandler;
