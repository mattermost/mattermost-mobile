// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export const getCommonStyleSheet = makeStyleSheetFromTheme((theme) => ({
    bodyText: {
        ...typography('Body', 200),
        color: theme.centerChannelColor,
    },
    sectionTitle: {
        ...typography('Body', 75, 'SemiBold'),
        color: theme.centerChannelColor,
        opacity: 0.64,
        textTransform: 'uppercase',
    },
}));

export const getCommonFileStyles = makeStyleSheetFromTheme((theme) => ({
    container: {
        backgroundColor: theme.centerChannelBg,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    header: {
        flex: 1,
    },
    name: {
        ...typography('Body', 100, 'SemiBold'),
        color: theme.centerChannelColor,
    },
    type: {
        ...typography('Body', 75),
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
}));
