// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import EmptyIllustration from './empty.svg';

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
        ...typography('Heading', 400, 'SemiBold'),
    },
    paragraph: {
        marginTop: 8,
        textAlign: 'center',
        color: changeOpacity(theme.centerChannelColor, 0.72),
        ...typography('Body', 200),
    },
}));

function EmptySavedPosts() {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <EmptyIllustration/>
            <FormattedText
                defaultMessage='No pinned messages yet'
                id='pinned_messages.empty.title'
                style={styles.title}
                testID='pinned_messages.empty.title'
            />
            <FormattedText
                defaultMessage={'To pin important messages, long-press on a message and choose Pin To Channel. Pinned messages will be visible to everyone in this channel.'}
                id='pinned_messages.empty.paragraph'
                style={styles.paragraph}
                testID='pinned_messages.empty.paragraph'
            />
        </View>
    );
}

export default EmptySavedPosts;
