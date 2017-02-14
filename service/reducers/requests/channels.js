// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {handleRequest, initialRequestState} from './helpers';
import {ChannelTypes} from 'service/constants';

import {combineReducers} from 'redux';

function getChannel(state = initialRequestState(), action) {
    return handleRequest(
        ChannelTypes.CHANNEL_REQUEST,
        ChannelTypes.CHANNEL_SUCCESS,
        ChannelTypes.CHANNEL_FAILURE,
        state,
        action
    );
}

function getChannels(state = initialRequestState(), action) {
    return handleRequest(
        ChannelTypes.CHANNELS_REQUEST,
        ChannelTypes.CHANNELS_SUCCESS,
        ChannelTypes.CHANNELS_FAILURE,
        state,
        action
    );
}

function myMembers(state = initialRequestState(), action) {
    return handleRequest(
        ChannelTypes.CHANNEL_MEMBERS_REQUEST,
        ChannelTypes.CHANNEL_MEMBERS_SUCCESS,
        ChannelTypes.CHANNEL_MEMBERS_FAILURE,
        state,
        action
    );
}

function createChannel(state = initialRequestState(), action) {
    return handleRequest(
        ChannelTypes.CREATE_CHANNEL_REQUEST,
        ChannelTypes.CREATE_CHANNEL_SUCCESS,
        ChannelTypes.CREATE_CHANNEL_FAILURE,
        state,
        action
    );
}

function updateChannel(state = initialRequestState(), action) {
    return handleRequest(
        ChannelTypes.UPDATE_CHANNEL_REQUEST,
        ChannelTypes.UPDATE_CHANNEL_SUCCESS,
        ChannelTypes.UPDATE_CHANNEL_FAILURE,
        state,
        action
    );
}

function updateChannelNotifyProps(state = initialRequestState(), action) {
    return handleRequest(
        ChannelTypes.NOTIFY_PROPS_REQUEST,
        ChannelTypes.NOTIFY_PROPS_SUCCESS,
        ChannelTypes.NOTIFY_PROPS_FAILURE,
        state,
        action
    );
}

function leaveChannel(state = initialRequestState(), action) {
    return handleRequest(
        ChannelTypes.LEAVE_CHANNEL_REQUEST,
        ChannelTypes.LEAVE_CHANNEL_SUCCESS,
        ChannelTypes.LEAVE_CHANNEL_FAILURE,
        state,
        action
    );
}

function joinChannel(state = initialRequestState(), action) {
    return handleRequest(
        ChannelTypes.JOIN_CHANNEL_REQUEST,
        ChannelTypes.JOIN_CHANNEL_SUCCESS,
        ChannelTypes.JOIN_CHANNEL_FAILURE,
        state,
        action
    );
}

function deleteChannel(state = initialRequestState(), action) {
    return handleRequest(
        ChannelTypes.DELETE_CHANNEL_REQUEST,
        ChannelTypes.DELETE_CHANNEL_SUCCESS,
        ChannelTypes.DELETE_CHANNEL_FAILURE,
        state,
        action
    );
}

function updateLastViewedAt(state = initialRequestState(), action) {
    return handleRequest(
        ChannelTypes.UPDATE_LAST_VIEWED_REQUEST,
        ChannelTypes.UPDATE_LAST_VIEWED_SUCCESS,
        ChannelTypes.UPDATE_LAST_VIEWED_FAILURE,
        state,
        action
    );
}

function getMoreChannels(state = initialRequestState(), action) {
    return handleRequest(
        ChannelTypes.MORE_CHANNELS_REQUEST,
        ChannelTypes.MORE_CHANNELS_SUCCESS,
        ChannelTypes.MORE_CHANNELS_FAILURE,
        state,
        action
    );
}

function getChannelStats(state = initialRequestState(), action) {
    return handleRequest(
        ChannelTypes.CHANNEL_STATS_REQUEST,
        ChannelTypes.CHANNEL_STATS_SUCCESS,
        ChannelTypes.CHANNEL_STATS_FAILURE,
        state,
        action
    );
}

function addChannelMember(state = initialRequestState(), action) {
    return handleRequest(
        ChannelTypes.ADD_CHANNEL_MEMBER_REQUEST,
        ChannelTypes.ADD_CHANNEL_MEMBER_SUCCESS,
        ChannelTypes.ADD_CHANNEL_MEMBER_FAILURE,
        state,
        action
    );
}

function removeChannelMember(state = initialRequestState(), action) {
    return handleRequest(
        ChannelTypes.REMOVE_CHANNEL_MEMBER_REQUEST,
        ChannelTypes.REMOVE_CHANNEL_MEMBER_SUCCESS,
        ChannelTypes.REMOVE_CHANNEL_MEMBER_FAILURE,
        state,
        action
    );
}

function autocompleteChannels(state = initialRequestState(), action) {
    return handleRequest(
        ChannelTypes.AUTOCOMPLETE_CHANNELS_REQUEST,
        ChannelTypes.AUTOCOMPLETE_CHANNELS_SUCCESS,
        ChannelTypes.AUTOCOMPLETE_CHANNELS_FAILURE,
        state,
        action
    );
}

export default combineReducers({
    getChannel,
    getChannels,
    myMembers,
    createChannel,
    updateChannel,
    updateChannelNotifyProps,
    leaveChannel,
    joinChannel,
    deleteChannel,
    updateLastViewedAt,
    getMoreChannels,
    getChannelStats,
    addChannelMember,
    removeChannelMember,
    autocompleteChannels
});
