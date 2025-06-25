// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, type StyleProp, Text, type TextStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {blendColors, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type EditedIndicatorProps = {
    baseTextStyle: StyleProp<TextStyle>;
    theme: Theme;
    context: string[];
    iconSize?: number;
    checkHeadings?: boolean;
    testID?: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    // Android has trouble giving text transparency depending on how it's nested,
    // so we calculate the resulting colour manually
    const editedOpacity = Platform.select({
        ios: 0.56,
        android: 1.0,
    });
    const editedColor = Platform.select({
        ios: theme.centerChannelColor,
        android: blendColors(theme.centerChannelBg, theme.centerChannelColor, 0.3),
    });

    return {
        editedIndicatorText: {
            color: editedColor,
            opacity: editedOpacity,
            fontStyle: 'italic',
            ...typography('Body', 25, 'Regular'),
        },
        editedText: {
            ...typography('Body', 100, 'Regular'),
        },
    };
});

const EditedIndicator = ({
    baseTextStyle,
    theme,
    context,
    iconSize = 14,
    checkHeadings = false,
    testID = 'edited_indicator',
}: EditedIndicatorProps) => {
    const style = getStyleSheet(theme);
    let spacer = '';
    const styles = [baseTextStyle, style.editedIndicatorText];

    // Add space for paragraphs, and optionally for headings
    if (context[0] === 'paragraph' || (checkHeadings && context[0]?.startsWith('heading'))) {
        spacer = '  ';
    }

    return (
        <Text
            style={styles}
            testID={testID}
        >
            {spacer}
            <CompassIcon
                name='pencil-outline'
                size={iconSize}
                color={theme.centerChannelColor}
            />
            <FormattedText
                id='post_message_view.edited'
                defaultMessage='Edited'
                style={style.editedText}
            />
        </Text>
    );
};

export default EditedIndicator;
