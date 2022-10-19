// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

export const BOTTOM_TAB_HEIGHT = 52;
export const BOTTOM_TAB_ICON_SIZE = 31.2;
export const PROFILE_PICTURE_SIZE = 32;
export const PROFILE_PICTURE_EMOJI_SIZE = 28;
export const SEARCH_INPUT_HEIGHT = Platform.select({android: 40, default: 36});

export const TEAM_SIDEBAR_WIDTH = 72;
export const TABLET_HEADER_HEIGHT = 44;
export const TABLET_SIDEBAR_WIDTH = 320;

export const IOS_STATUS_BAR_HEIGHT = 20;
export const IOS_DEFAULT_HEADER_HEIGHT = 44;
export const ANDROID_DEFAULT_HEADER_HEIGHT = 56;
export const LARGE_HEADER_TITLE_HEIGHT = 60;
export const HEADER_WITH_SUBTITLE = 24;
export const KEYBOARD_TRACKING_OFFSET = 72;
export const UNLOCKED_SEARCH_BOTTOM_MARGIN = Platform.select({android: -14, default: -14});
export const LOCKED_SEARCH_BOTTOM_MARGIN = Platform.select({android: 11, default: 0});

export const TABLET_SEARCH_HEIGHT_COLLAPSED = Platform.select({android: 88, default: 98}); // 98 total, insets=24, 74
export const TABLET_SEARCH_HEIGHT_EXPANDED = Platform.select({android: 145, default: 182}); // 182 total, insets=24, 158

export const JOIN_CALL_BAR_HEIGHT = 38;
export const CURRENT_CALL_BAR_HEIGHT = 74;

export const QUICK_OPTIONS_HEIGHT = 270;

export default {
    TABLET_SEARCH_HEIGHT_COLLAPSED,
    TABLET_SEARCH_HEIGHT_EXPANDED,
    UNLOCKED_SEARCH_BOTTOM_MARGIN,
    LOCKED_SEARCH_BOTTOM_MARGIN,
    BOTTOM_TAB_HEIGHT,
    BOTTOM_TAB_ICON_SIZE,
    PROFILE_PICTURE_SIZE,
    PROFILE_PICTURE_EMOJI_SIZE,
    DATA_SOURCE_USERS: 'users',
    DATA_SOURCE_CHANNELS: 'channels',
    DATA_SOURCE_DYNAMIC: 'dynamic',
    SEARCH_INPUT_HEIGHT,
    TABLET_SIDEBAR_WIDTH,
    TEAM_SIDEBAR_WIDTH,
    TABLET_HEADER_HEIGHT,
    IOS_STATUS_BAR_HEIGHT,
    IOS_DEFAULT_HEADER_HEIGHT,
    ANDROID_DEFAULT_HEADER_HEIGHT,
    LARGE_HEADER_TITLE_HEIGHT,
    HEADER_WITH_SUBTITLE,
    KEYBOARD_TRACKING_OFFSET,
    QUICK_OPTIONS_HEIGHT,
};

