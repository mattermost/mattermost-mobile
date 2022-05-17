// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function getStatusColors(theme: Theme): Dictionary<string> {
    return {
        good: '#00c100',
        warning: '#dede01',
        danger: theme.errorTextColor,
        default: theme.centerChannelColor,
        primary: theme.buttonBg,
        success: theme.onlineIndicator,
    };
}
