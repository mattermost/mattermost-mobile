// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type ThemeKey = 'denim' | 'sapphire' | 'quartz' | 'indigo' | 'onyx';

type ThemeType = 'Denim' | 'Sapphire' | 'Quartz' | 'Indigo' | 'Onyx' | 'custom';

type Theme = {
    [key: string]: string | undefined;
    type?: string;
    sidebarBg: string;
    sidebarText: string;
    sidebarUnreadText: string;
    sidebarTextHoverBg: string;
    sidebarTextActiveBorder: string;
    sidebarTextActiveColor: string;
    sidebarHeaderBg: string;
    sidebarHeaderTextColor: string;
    onlineIndicator: string;
    awayIndicator: string;
    dndIndicator: string;
    mentionBg: string;
    mentionColor: string;
    centerChannelBg: string;
    centerChannelColor: string;
    newMessageSeparator: string;
    linkColor: string;
    buttonBg: string;
    buttonColor: string;
    errorTextColor: string;
    mentionHighlightBg: string;
    mentionHighlightLink: string;
    codeTheme: string;
};
