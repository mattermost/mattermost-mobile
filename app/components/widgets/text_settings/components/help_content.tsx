// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import Markdown from '@components/markdown';
import {useTheme} from '@context/theme';
import {MarkdownBlockStyles, MarkdownTextStyles} from '@typings/global/markdown';
import {makeStyleSheetFromTheme} from '@utils/theme';

type HelpContentProps = {
    blockStyles: MarkdownBlockStyles;
    helpText: string | number;
    textStyles: MarkdownTextStyles;
};

const HelpContent = ({blockStyles, helpText, textStyles}: HelpContentProps) => {
    const theme = useTheme();
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
