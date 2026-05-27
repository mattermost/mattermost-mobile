// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BOARDS_TABLES} from '@boards/constants/database';

import {OperationType} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';

import type BoardViewModel from '@boards/types/database/models/board_view';
import type {TransformerArgs} from '@typings/database/database';

const {BOARD_VIEW} = BOARDS_TABLES;

/**
 * transformBoardViewRecord: Prepares a record of the SERVER database 'BoardView' table for update or create actions.
 */
export const transformBoardViewRecord = ({action, database, value}: TransformerArgs<BoardViewModel, BoardView>): Promise<BoardViewModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        throw new Error('Record not found for non create action');
    }

    const fieldsMapper = (view: BoardViewModel) => {
        view._raw.id = isCreateAction ? (raw.id ?? view.id) : record!.id;
        view.channelId = raw.channel_id ?? record?.channelId ?? '';
        view.type = raw.type ?? record?.type ?? 'kanban';
        view.creatorId = raw.creator_id ?? record?.creatorId ?? '';
        view.title = raw.title ?? record?.title ?? '';
        view.description = raw.description ?? record?.description ?? null;
        view.sortOrder = raw.sort_order ?? record?.sortOrder ?? 0;
        view.props = raw.props ?? record?.props ?? null;
        view.createAt = raw.create_at ?? record?.createAt ?? 0;
        view.updateAt = raw.update_at ?? record?.updateAt ?? 0;
        view.deleteAt = raw.delete_at ?? record?.deleteAt ?? 0;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: BOARD_VIEW,
        value,
        fieldsMapper,
    });
};
