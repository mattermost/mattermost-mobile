// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FormattedMessage} from 'react-intl';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedTime from '@components/formatted_time';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUserTimezone} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            paddingVertical: 12,
            paddingHorizontal: 16,
            color: changeOpacity(theme.centerChannelColor, 0.72),
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            width: '100%',
        },
        text: {
            color: changeOpacity(theme.centerChannelColor, 0.75),
            fontSize: 14,
        },
        link: {
            color: theme.linkColor,
            ...typography('Body', 100, 'SemiBold'),
        },
    };
});

type Props = {
    currentUser?: UserModel;
    isMilitaryTime: boolean;
    isThread?: boolean;
    scheduledPostCount?: number;
}

export function ScheduledPostIndicator({currentUser, isMilitaryTime, isThread, scheduledPostCount = 0}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    let scheduledPostText: React.ReactNode;

    if (scheduledPostCount === 0) {
        return null;
    } else if (scheduledPostCount === 1) {
        // eslint-disable-next-line no-warning-comments
        //TODO: remove this hardcoded value with actual value
        const value = 1738611689000;

        const dateTime = (
            <FormattedTime
                timezone={getUserTimezone(currentUser)}
                isMilitaryTime={isMilitaryTime}
                value={value}
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
    } else {
        scheduledPostText = isThread ? (
            <FormattedMessage
                id='scheduled_post.channel_indicator.thread.multiple'
                defaultMessage='{count} scheduled messages in thread.'
                values={{
                    count: scheduledPostCount,
                }}
            />
        ) : (
            <FormattedMessage
                id='scheduled_post.channel_indicator.multiple'
                defaultMessage='{count} scheduled messages in channel.'
                values={{
                    count: scheduledPostCount,
                }}
            />
        );
    }

    return (
        <View
            className='ScheduledPostIndicator'
        >
            <View style={styles.container}>
                <CompassIcon
                    color={changeOpacity(theme.centerChannelColor, 0.6)}
                    name='clock-send-outline'
                    size={18}
                />
                <Text style={styles.text}>
                    {scheduledPostText}
                    {' '}
                    <Text style={styles.link}>
                        <FormattedMessage
                            id='scheduled_post.channel_indicator.link_to_scheduled_posts.text'
                            defaultMessage='See all.'
                        />
                    </Text>
                </Text>
            </View>
        </View>
    );
}
