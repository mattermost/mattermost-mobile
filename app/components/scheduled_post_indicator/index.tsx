// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {FormattedMessage} from 'react-intl';
import {DeviceEventEmitter, Text, View} from 'react-native';

import {switchToGlobalDrafts} from '@actions/local/draft';
import CompassIcon from '@components/compass_icon';
import {Events} from '@constants';
import {DRAFT_SCREEN_TAB_SCHEDULED_POSTS} from '@constants/draft';
import {DRAFT} from '@constants/screens';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            paddingVertical: 12,
            paddingHorizontal: 16,
            color: changeOpacity(theme.centerChannelColor, 0.72),
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            width: '100%',
        },
        text: {
            color: changeOpacity(theme.centerChannelColor, 0.75),
            ...typography('Body', 100, 'SemiBold'),
        },
        link: {
            color: theme.linkColor,
            ...typography('Body', 100, 'SemiBold'),
        },
    };
});

type Props = {
    isThread?: boolean;
    scheduledPostCount?: number;
}

function ScheduledPostIndicator({
    isThread,
    scheduledPostCount = 0,
}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const handleSeeAllScheduledPosts = useCallback(async () => {
        const {error} = await switchToGlobalDrafts(serverUrl, undefined, DRAFT_SCREEN_TAB_SCHEDULED_POSTS);
        if (!error) {
            DeviceEventEmitter.emit(Events.ACTIVE_SCREEN, DRAFT);
        }
    }, [serverUrl]);

    const scheduledPostText = isThread ? (
        <FormattedMessage
            id='scheduled_post.channel_indicator.thread'
            defaultMessage={`{count, plural,
                one {# scheduled message in thread.}
                other {# scheduled messages in thread.}
            }`}
            values={{count: scheduledPostCount}}
        />
    ) : (
        <FormattedMessage
            id='scheduled_post.channel_indicator'
            defaultMessage={`{count, plural,
                one {# scheduled message in channel.}
                other {# scheduled messages in channel.}
            }`}
            values={{count: scheduledPostCount}}
        />
    );

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
                <Text
                    style={styles.text}
                    testID='scheduled_post_header.scheduled_post_indicator'
                >
                    {scheduledPostText}
                    {' '}
                    <Text
                        style={styles.link}
                        onPress={handleSeeAllScheduledPosts}
                    >
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

export default ScheduledPostIndicator;
