// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Screens} from '@constants';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {showOverlay} from '@screens/navigation';

import type {AvailableScreens} from '@typings/screens/navigation';
import type {PrimitiveType} from 'react-intl';

export type ShowSnackBarArgs = {
    barType: keyof typeof SNACK_BAR_TYPE;
    onAction?: () => void;
    sourceScreen?: AvailableScreens;
    messageValues?: Record<string, PrimitiveType>;
};

export const showSnackBar = (passProps: ShowSnackBarArgs) => {
    const screen = Screens.SNACK_BAR;
    showOverlay(screen, passProps);
};

export const showMuteChannelSnackbar = (muted: boolean, onAction: () => void) => {
    return showSnackBar({
        onAction,
        barType: muted ? SNACK_BAR_TYPE.MUTE_CHANNEL : SNACK_BAR_TYPE.UNMUTE_CHANNEL,
    });
};

export const showFavoriteChannelSnackbar = (favorited: boolean, onAction: () => void) => {
    return showSnackBar({
        onAction,
        barType: favorited ? SNACK_BAR_TYPE.FAVORITE_CHANNEL : SNACK_BAR_TYPE.UNFAVORITE_CHANNEL,
    });
};

export const showAddChannelMembersSnackbar = (count: number) => {
    return showSnackBar({
        barType: SNACK_BAR_TYPE.ADD_CHANNEL_MEMBERS,
        sourceScreen: Screens.CHANNEL_ADD_MEMBERS,
        messageValues: {numMembers: count},
    });
};

export const showRemoveChannelUserSnackbar = () => {
    return showSnackBar({
        barType: SNACK_BAR_TYPE.REMOVE_CHANNEL_USER,
        sourceScreen: Screens.MANAGE_CHANNEL_MEMBERS,
    });
};

export const showThreadFollowingSnackbar = (following: boolean, onAction: () => void) => {
    return showSnackBar({
        onAction,
        barType: following ? SNACK_BAR_TYPE.FOLLOW_THREAD : SNACK_BAR_TYPE.UNFOLLOW_THREAD,
    });
};
