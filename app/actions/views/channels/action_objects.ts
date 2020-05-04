// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Action} from '@mm-redux/types/actions';
import {ViewTypes} from '@constants';
import telemetry from 'app/telemetry';

export function setLastGetPostsForChannel(channelId: string, time: number): Action {
    return {
        type: ViewTypes.SET_LAST_GET_POSTS,
        channelId,
        time,
    };
}

export function postDraftChangedForChannel(channelId: string, draft: string): Action {
    return {
        type: ViewTypes.POST_DRAFT_CHANGED,
        channelId,
        draft,
    };
}

export function removeLastChannelForTeam(teamId: string, channelId: string): Action {
    return {
        type: ViewTypes.REMOVE_LAST_CHANNEL_FOR_TEAM,
        data: {
            teamId,
            channelId,
        }
    };
}

export function setChannelLoading(loading: boolean): Action {
    if (loading) {
        telemetry.start(['channel:loading']);
    } else {
        telemetry.end(['channel:loading']);
    }

    return {
        type: ViewTypes.SET_CHANNEL_LOADER,
        loading,
    };
}

export function channelPostsLoading(channelId: string, loading: boolean): Action {
    if (loading) {
        telemetry.reset();
        telemetry.start(['posts:loading']);
    } else {
        telemetry.end(['posts:loading']);
        telemetry.save();
    }

    return {
        type: ViewTypes.LOADING_POSTS,
        data: {
            channelId,
            loading,
        },
    };
}

export function setChannelRefreshing(loading: boolean = true): Action {
    return {
        type: ViewTypes.SET_CHANNEL_REFRESHING,
        loading,
    };
}

export function setChannelRetryFailed(failed: boolean = true): Action {
    return {
        type: ViewTypes.SET_CHANNEL_RETRY_FAILED,
        failed,
    };
}

export function setChannelDisplayName(displayName: string): Action {
    return {
        type: ViewTypes.SET_CHANNEL_DISPLAY_NAME,
        displayName,
    };
}

export function setLoadMorePostsVisible(visible: boolean): Action {
    return {
        type: ViewTypes.SET_LOAD_MORE_POSTS_VISIBLE,
        data: visible,
    };
}
