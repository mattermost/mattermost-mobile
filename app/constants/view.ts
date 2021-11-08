// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

export const BOTTOM_TAB_ICON_SIZE = 31.2;
export const PROFILE_PICTURE_SIZE = 32;
export const PROFILE_PICTURE_EMOJI_SIZE = 28;
export const SEARCH_INPUT_HEIGHT = Platform.select({android: 40, ios: 36})!;
export const TABLET_SIDEBAR_WIDTH = 320;
export const TEAM_SIDEBAR_WIDTH = 72;

export default {
    BOTTOM_TAB_ICON_SIZE,
    PROFILE_PICTURE_SIZE,
    PROFILE_PICTURE_EMOJI_SIZE,
    DATA_SOURCE_USERS: 'users',
    DATA_SOURCE_CHANNELS: 'channels',
    SEARCH_INPUT_HEIGHT,
    TABLET_SIDEBAR_WIDTH,
    TEAM_SIDEBAR_WIDTH,
};
