// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {StyleSheet} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 40,
    },
    title: {
        ...typography('Heading', 600, 'SemiBold'),
        color: theme.centerChannelColor,
        marginBottom: 8,
    },
    description: {
        ...typography('Body', 200),
        color: changeOpacity(theme.centerChannelColor, 0.72),
        marginBottom: 24,
        lineHeight: 22,
    },
    statusCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
    },
    statusLabel: {
        ...typography('Body', 300, 'SemiBold'),
        marginBottom: 6,
    },
    statusDetail: {
        ...typography('Body', 100),
        color: changeOpacity(theme.centerChannelColor, 0.64),
        lineHeight: 20,
    },
    sectionTitle: {
        ...typography('Body', 300, 'SemiBold'),
        color: theme.centerChannelColor,
        marginTop: 8,
        marginBottom: 10,
    },
    summaryRow: {
        marginBottom: 12,
    },
    summaryLabel: {
        ...typography('Body', 100, 'SemiBold'),
        color: changeOpacity(theme.centerChannelColor, 0.56),
        marginBottom: 3,
    },
    summaryValue: {
        ...typography('Body', 200),
        color: theme.centerChannelColor,
        lineHeight: 21,
    },
    editor: {
        minHeight: 260,
        maxHeight: 420,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.24),
        color: theme.centerChannelColor,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
        padding: 12,
        textAlignVertical: 'top',
        ...typography('Body', 100),
    },
    helpText: {
        ...typography('Body', 100),
        color: changeOpacity(theme.centerChannelColor, 0.60),
        lineHeight: 20,
        marginTop: 12,
        marginBottom: 4,
    },
    errorText: {
        ...typography('Body', 200),
        color: theme.errorTextColor,
        lineHeight: 21,
        marginBottom: 16,
    },
    button: {
        marginTop: 12,
    },
    footerNote: {
        ...typography('Body', 75),
        color: changeOpacity(theme.centerChannelColor, 0.52),
        lineHeight: 19,
        marginTop: 24,
    },
}));

export default getStyleSheet;
