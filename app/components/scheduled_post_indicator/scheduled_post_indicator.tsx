// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {FormattedMessage} from 'react-intl';
import {DeviceEventEmitter, Text, View} from 'react-native';

import {switchToGlobalDrafts} from '@actions/local/draft';
import CompassIcon from '@components/compass_icon';
import ScheduledPostIndicatorWithDatetime from '@components/scheduled_post_indicator_with_datetime';
import {Events} from '@constants';
import {DRAFT} from '@constants/screens';
import {useTheme} from '@context/theme';
import {DRAFT_SCREEN_TAB_SCHEDULED_POSTS} from '@screens/global_drafts';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type UserModel from '@typings/database/models/servers/user';

const WRAPPER_HEIGHT = 40;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        wrapper: {
            height: WRAPPER_HEIGHT,
        },
        container: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            paddingVertical: 12,
            paddingBottom: 20,
            paddingHorizontal: 16,
            color: changeOpacity(theme.centerChannelColor, 0.72),
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            position: 'absolute',
            top: 0,
            width: '100%',
        },
        text: {
            color: changeOpacity(theme.centerChannelColor, 0.75),
            fontSize: 14,
        },
        link: {
            color: theme.linkColor,
            fontSize: 14,
        },
    };
});

type Props = {
    currentUser?: UserModel;
    isMilitaryTime: boolean;
    isThread?: boolean;
    scheduledPostCount?: number;
    channelId: string;
}

export function ScheduledPostIndicator({
    currentUser,
    isMilitaryTime,
    isThread,
    scheduledPostCount = 0,
    channelId,
}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const handleSeeAllScheduledPosts = useCallback(() => {
        DeviceEventEmitter.emit(Events.ACTIVE_SCREEN, DRAFT);
        switchToGlobalDrafts(DRAFT_SCREEN_TAB_SCHEDULED_POSTS);
    }, []);

    let scheduledPostText: React.ReactNode;

    if (scheduledPostCount === 0) {
        return null;
    } else if (scheduledPostCount === 1) {
        scheduledPostText = (
            <ScheduledPostIndicatorWithDatetime
                channelId={channelId}
                currentUser={currentUser}
                isMilitaryTime={isMilitaryTime}
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
            style={styles.wrapper}
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
