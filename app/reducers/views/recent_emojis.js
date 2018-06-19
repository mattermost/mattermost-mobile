// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ViewTypes} from 'app/constants';

export default function recentEmojis(state = [], action) {
    switch (action.type) {
    case ViewTypes.ADD_RECENT_EMOJI: {
        const nextState = [...state];

        const index = nextState.indexOf(action.emoji);
        if (index !== -1) {
            nextState.splice(index, 1);
        }

        nextState.unshift(action.emoji);

        return nextState;
    }
    default:
        return state;
    }
}