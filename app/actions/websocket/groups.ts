// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GroupTypes} from '@mm-redux/action_types';
import {ActionResult, DispatchFunc, batchActions} from '@mm-redux/types/actions';
import {WebSocketMessage} from '@mm-redux/types/websocket';

export function handleGroupUpdatedEvent(msg: WebSocketMessage) {
    return (dispatch: DispatchFunc) : ActionResult => {
        const data = JSON.parse(msg.data.group);
        dispatch(batchActions([
            {
                type: GroupTypes.RECEIVED_GROUP,
                data,
            },
            {
                type: GroupTypes.RECEIVED_MY_GROUPS,
                data: [data],
            },
        ]));
        return {data: true};
    };
}
