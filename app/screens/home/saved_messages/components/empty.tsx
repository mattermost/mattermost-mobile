// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import SavedPostsIcon from './saved_posts_icon';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        maxWidth: 480,
    },
    title: {
        color: theme.centerChannelColor,
        textAlign: 'center',
        ...typography('Heading', 400),
    },
    paragraph: {
        marginTop: 8,
        textAlign: 'center',
        color: changeOpacity(theme.centerChannelColor, 0.72),
        ...typography('Body', 200),
    },
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
    },
}));

function EmptySavedMessages() {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <SavedPostsIcon style={styles.icon}/>
            <FormattedText
                defaultMessage='No saved messages yet'
                id='saved_messages.empty.title'
                style={styles.title}
                testID='saved_messages.empty.title'
            />
            <FormattedText
                defaultMessage={'To save something for later, long-press on a message and choose Save from the menu. Saved messages are only visible to you.'}
                id='saved_messages.empty.paragraph'
                style={styles.paragraph}
                testID='saved_messages.empty.paragraph'
            />
        </View>
    );
}

export default EmptySavedMessages;
