// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type LegacyThemeKey = 'default' | 'organization' | 'mattermostDark' | 'windows10';

export type ThemeKey = 'denim' | 'sapphire' | 'quartz' | 'indigo' | 'onyx';

export type LegacyThemeType = 'Mattermost' | 'Organization' | 'Mattermost Dark' | 'Windows Dark';

export type ThemeType = 'Denim' | 'Sapphire' | 'Quartz' | 'Indigo' | 'Onyx';

export type Theme = {
    [key: string]: string | undefined;
    type?: ThemeType | 'custom';
    sidebarBg: string;
    sidebarText: string;
    sidebarUnreadText: string;
    sidebarTextHoverBg: string;
    sidebarTextActiveBorder: string;
    sidebarTextActiveColor: string;
    sidebarHeaderBg: string;
    sidebarHeaderTextColor: string;
    sidebarTeamBarBg: string;
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

export type ThemeTypeMap = Record<ThemeType | LegacyThemeType, ThemeKey>;
