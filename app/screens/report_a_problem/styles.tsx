// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {makeStyleSheetFromTheme} from '@utils/theme';
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
