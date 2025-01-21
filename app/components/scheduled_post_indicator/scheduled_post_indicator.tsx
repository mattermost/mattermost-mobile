// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';
import {FormattedMessage} from 'react-intl';
import FormattedTime from '@components/formatted_time';
import {getUserTimezone} from '@utils/user';
import type UserModel from '@typings/database/models/servers/user';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {useTheme} from '@context/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            paddingVertical: 12,
            paddingHorizontal: 16,
            color: changeOpacity(theme.centerChannelColor, 0.72),
        },
    };
});

type Props = {
    currentUser?: UserModel;
    isMilitaryTime: boolean;
}

export function ScheduledPostIndicator({currentUser, isMilitaryTime}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const [scheduledPostCount, setScheduledPostCount] = React.useState(1);

    if (scheduledPostCount === 0) {
        return null;
    }

    let scheduledPostText: React.ReactNode;

    if (scheduledPostCount === 1) {
        const dateTime = (
            <FormattedTime
                timezone={getUserTimezone(currentUser)}
                isMilitaryTime={isMilitaryTime}
                value={1768902936000}
                testID='scheduled_post_indicator_single_time'
            />
        );

        scheduledPostText = (
            <FormattedMessage
                id='scheduled_post.channel_indicator.single'
                defaultMessage='Message scheduled for {dateTime}.'
                values={{
                    dateTime,
                }}
            />
        );
    }

    return (
        <View
            className='ScheduledPostIndicator'
            style={styles.container}
        >
            <Text>
                {scheduledPostText}
                <FormattedMessage
                    id='scheduled_post.channel_indicator.link_to_scheduled_posts.text'
                    defaultMessage='See all.'
                />
            </Text>
        </View>
    );
}
