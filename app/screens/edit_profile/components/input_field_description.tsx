// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import Markdown from '@components/markdown';
import {useTheme} from '@context/theme';
import {MarkdownBlockStyles, MarkdownTextStyles} from '@typings/global/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type HelpContentProps = {
    blockStyles: MarkdownBlockStyles;
    text: string | number;
    textStyles: MarkdownTextStyles;
};

const InputFieldDescription = ({
    blockStyles,
    text,
    textStyles,
}: HelpContentProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <View style={style.container}>
            <Markdown
                baseTextStyle={style.text}
                textStyles={textStyles}
                blockStyles={blockStyles}
                value={text}
                theme={theme}
            />
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            marginTop: 10,
        },
        text: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});

export default InputFieldDescription;
