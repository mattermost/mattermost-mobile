// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import Markdown from '@components/markdown';
import {MarkdownBlockStyles, MarkdownTextStyles} from '@typings/global/markdown';
import {makeStyleSheetFromTheme} from '@utils/theme';

type HelpContentProps = {
    blockStyles: MarkdownBlockStyles;
    helpText: string | number;
    textStyles: MarkdownTextStyles;
    theme: Theme;
};

const HelpContent = ({blockStyles, helpText, textStyles, theme}: HelpContentProps) => {
    const style = getStyleSheet(theme);

    return (
        <View style={style.helpTextContainer}>
            <Markdown
                baseTextStyle={style.helpText}
                textStyles={textStyles}
                blockStyles={blockStyles}
                value={helpText}
                theme={theme}
            />
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        title: {
            fontSize: 14,
            color: theme.centerChannelColor,
            marginLeft: 15,
        },
    };
});

export default HelpContent;
