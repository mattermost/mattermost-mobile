// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Preferences from 'mattermost-redux/constants/preferences';

export const STATUS_COLORS = {
    good: '#00c100',
    warning: '#dede01',
    danger: Preferences.THEMES.default.errorTextColor,
    default: Preferences.THEMES.default.centerChannelColor,
    primary: Preferences.THEMES.default.buttonBg,
    success: Preferences.THEMES.default.onlineIndicator,
};
