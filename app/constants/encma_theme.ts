// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Preferences from './preferences';

// The reference's midnight surfaces and luminous accents, with readable text
// and distinct error/presence colors. Explicit server/user themes still win.
export const ENCMA_THEME: Theme = {
    ...Preferences.THEMES.onyx,
    sidebarBg: '#090E29',
    sidebarHeaderBg: '#101631',
    sidebarTeamBarBg: '#070B21',
    sidebarText: '#B9C2DB',
    sidebarUnreadText: '#F4F7FF',
    sidebarTextHoverBg: '#1B2446',
    sidebarTextActiveBorder: '#18E2D0',
    sidebarTextActiveColor: '#FFFFFF',
    sidebarHeaderTextColor: '#F4F7FF',
    centerChannelBg: '#0C122D',
    centerChannelColor: '#E9EEFF',
    buttonBg: '#32D6EA',
    buttonColor: '#07132A',
    linkColor: '#50E6DB',
    onlineIndicator: '#22D3A2',
    awayIndicator: '#F5BE55',
    dndIndicator: '#F27891',
    errorTextColor: '#FF8FA8',
    mentionBg: '#795DE4',
    mentionColor: '#FFFFFF',
    newMessageSeparator: '#18E2D0',
    mentionHighlightBg: '#24365A',
    mentionHighlightLink: '#7AF5E9',
};
