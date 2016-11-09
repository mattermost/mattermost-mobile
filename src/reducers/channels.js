// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import _ from 'lodash';
import {ChannelsTypes, LogoutTypes} from 'constants';

export const initState = {
    status: 'not fetched',
    error: null,
    data: {},
    currentChannelId: null
};

// TODO: this can be extracted into a util
function zipById(channels) {
    return _.zipObject(_.map(channels, 'id'), channels);
}

export default function reduceChannels(state = initState, action) {
    switch (action.type) {

    case ChannelsTypes.SELECT_CHANNEL:
        return {...state,
            currentChannelId: action.channelId
        };

    case ChannelsTypes.FETCH_CHANNELS_REQUEST:
        return {...state,
            status: 'fetching',
            error: null
        };
    case ChannelsTypes.FETCH_CHANNELS_SUCCESS:
        return {...state,
            status: 'fetched',
            data: zipById(action.data.channels)
        };
    case ChannelsTypes.FETCH_CHANNELS_FAILURE:
        return {...state,
            status: 'failed',
            error: action.error
        };

    case LogoutTypes.LOGOUT_SUCCESS:
        return initState;
    default:
        return state;
    }
}
