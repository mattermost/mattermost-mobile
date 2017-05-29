// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Platform, StyleSheet} from 'react-native';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export const getMarkdownTextStyles = makeStyleSheetFromTheme((theme) => {
    const codeFont = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

    return StyleSheet.create({
        emph: {
            fontStyle: 'italic'
        },
        strong: {
            fontWeight: 'bold'
        },
        link: {
            color: theme.linkColor
        },
        heading1: {
            fontSize: 17,
            lineHeight: 25,
            fontWeight: '700',
            marginTop: 10,
            marginBottom: 10
        },
        heading2: {
            fontSize: 17,
            lineHeight: 25,
            fontWeight: '700',
            marginTop: 10,
            marginBottom: 10
        },
        heading3: {
            fontSize: 17,
            lineHeight: 25,
            fontWeight: '700',
            marginTop: 10,
            marginBottom: 10
        },
        heading4: {
            fontSize: 17,
            lineHeight: 25,
            fontWeight: '700',
            marginTop: 10,
            marginBottom: 10
        },
        heading5: {
            fontSize: 17,
            lineHeight: 25,
            fontWeight: '700',
            marginTop: 10,
            marginBottom: 10
        },
        heading6: {
            fontSize: 17,
            lineHeight: 25,
            fontWeight: '700',
            marginTop: 10,
            marginBottom: 10
        },
        code: {
            alignSelf: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            fontFamily: codeFont,
            paddingHorizontal: 4,
            paddingVertical: 2
        },
        codeBlock: {
            fontFamily: codeFont
        },
        horizontalRule: {
            backgroundColor: theme.centerChannelColor,
            height: StyleSheet.hairlineWidth,
            flex: 1,
            marginVertical: 10
        },
        mention: {
            color: theme.linkColor
        }
    });
});

export const getMarkdownBlockStyles = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        codeBlock: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderRadius: 4,
            paddingHorizontal: 4,
            paddingVertical: 2
        },
        horizontalRule: {
            backgroundColor: theme.centerChannelColor
        },
        quoteBlock: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            padding: 5
        }
    });
});

export default {
    getMarkdownBlockStyles,
    getMarkdownTextStyles
};
