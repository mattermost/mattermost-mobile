// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image} from 'expo-image';
import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const scheduled_message_image = require('@assets/images/Scheduled_Message.png');

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        image: {
            width: 120,
            height: 120,
            marginBottom: 20,
        },
        title: {
            ...typography('Heading', 400, 'SemiBold'),
            color: theme.centerChannelColor,
        },
        subtitle: {
            ...typography('Body'),
            color: changeOpacity(theme.centerChannelColor, 0.72),
            textAlign: 'center',
            marginTop: 8,
        },
    };
});

const ScheduledPostEmptyComponent = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    return (
        <View
            style={styles.container}
            testID='scheduled_post_empty_component'
        >
            <Image
                source={scheduled_message_image}
                style={styles.image}
            />
            <FormattedText
                id='scheduled_post.empty.title'
                defaultMessage={'No scheduled drafts at the moment'}
                style={styles.title}
            />
            <FormattedText
                id='scheduled_post.empty.subtitle'
                defaultMessage={'Schedule drafts to send messages at a later time. Any scheduled drafts will show up here and can be modified after being scheduled.'}
                style={styles.subtitle}
            />
        </View>
    );
};

export default ScheduledPostEmptyComponent;
