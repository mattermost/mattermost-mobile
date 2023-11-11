// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

export const BOTTOM_TAB_HEIGHT = 52;
export const BOTTOM_TAB_ICON_SIZE = 31.2;
export const PROFILE_PICTURE_SIZE = 32;
export const PROFILE_PICTURE_EMOJI_SIZE = 28;

export const TEAM_SIDEBAR_WIDTH = 72;
export const TABLET_HEADER_HEIGHT = 44;
export const TABLET_SIDEBAR_WIDTH = 320;

export const STATUS_BAR_HEIGHT = 20;
export const DEFAULT_HEADER_HEIGHT = Platform.select({android: 56, default: 44});
export const LARGE_HEADER_TITLE_HEIGHT = 60;
export const SUBTITLE_HEIGHT = 24;
export const KEYBOARD_TRACKING_OFFSET = 72;

export const SEARCH_INPUT_HEIGHT = Platform.select({android: 40, default: 36});
export const SEARCH_INPUT_MARGIN = 5;

export const JOIN_CALL_BAR_HEIGHT = 40;
export const CURRENT_CALL_BAR_HEIGHT = 60;
export const CALL_ERROR_BAR_HEIGHT = 52;
export const CALL_NOTIFICATION_BAR_HEIGHT = 40;

export const ANNOUNCEMENT_BAR_HEIGHT = 40;

export const HOME_PADDING = {
    paddingLeft: 18,
    paddingRight: 20,
};

export default {
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
    STATUS_BAR_HEIGHT,
    DEFAULT_HEADER_HEIGHT,
    LARGE_HEADER_TITLE_HEIGHT,
    SUBTITLE_HEIGHT,
    KEYBOARD_TRACKING_OFFSET,
};

