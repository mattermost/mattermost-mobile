// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import Markdown from '@components/markdown';
import {useTheme} from '@context/theme';
import {MarkdownBlockStyles, MarkdownTextStyles} from '@typings/global/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type DisabledContentProps = {
    blockStyles: MarkdownBlockStyles;
    disabledText: string | number;
    textStyles: MarkdownTextStyles;
}

const DisableContent = ({blockStyles, disabledText, textStyles}: DisabledContentProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <View style={style.helpTextContainer}>
            <Markdown
                theme={theme}
                baseTextStyle={style.helpText}
                textStyles={textStyles}
                blockStyles={blockStyles}
                value={disabledText}
            />
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        helpTextContainer: {
            marginTop: 10,
        },
        helpText: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});

export default DisableContent;
