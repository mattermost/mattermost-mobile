// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {type StyleProp, View, type ViewStyle} from 'react-native';

import FormattedText from '@components/formatted_text';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type NewMessagesLineProps = {
    style?: StyleProp<ViewStyle>;
    theme: Theme;
    testID?: string;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            alignItems: 'center',
            flexDirection: 'row',
            height: 28,
            paddingHorizontal: 16,
        },
        textContainer: {
            marginHorizontal: 8,
        },
        line: {
            flex: 1,
            height: 1,
            backgroundColor: theme.newMessageSeparator,
        },
        text: {
            color: theme.newMessageSeparator,
            marginHorizontal: 4,
            ...typography('Body', 75, 'SemiBold'),
        },
    };
});

function NewMessagesLine({style, testID, theme}: NewMessagesLineProps) {
    const styles = getStyleFromTheme(theme);

    return (
        <View style={[styles.container, style]}>
            <View style={styles.line}/>
            <View style={styles.textContainer}>
                <FormattedText
                    id='posts_view.newMsg'
                    defaultMessage='New Messages'
                    style={styles.text}
                    testID={testID}
                />
            </View>
            <View style={styles.line}/>
        </View>
    );
}

export default NewMessagesLine;
