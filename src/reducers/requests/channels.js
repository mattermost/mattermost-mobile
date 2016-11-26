// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {handleRequest, initialRequestState} from './helpers';
import {ChannelTypes, RequestStatus} from 'constants';

import {combineReducers} from 'redux';

function channels(state = initialRequestState, action) {
    return handleRequest(
        ChannelTypes.CHANNELS_REQUEST,
        ChannelTypes.CHANNELS_SUCCESS,
        ChannelTypes.CHANNELS_FAILURE,
        state,
        action
    );
}

function myMembers(state = initialRequestState, action) {
    return handleRequest(
        ChannelTypes.CHANNEL_MEMBERS_REQUEST,
        ChannelTypes.CHANNEL_MEMBERS_SUCCESS,
        ChannelTypes.CHANNEL_MEMBERS_FAILURE,
        state,
        action
    );
}

export default combineReducers({
    channels,
    myMembers
});
