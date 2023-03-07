// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, StyleSheet, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import PostPriorityLabel from '@components/post_priority/post_priority_label';
import {PostPriorityColors} from '@constants/post';
import {useTheme} from '@context/theme';

type Props = {
    postPriority: PostPriority;
    noMentionsError: boolean;
}

const style = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginLeft: 12,
        marginTop: Platform.select({
            ios: 3,
            android: 10,
        }),
    },
    labelContainer: {
        marginRight: 7,
    },
    ackContainer: {
        marginRight: 7,
    },
    notificationsContainer: {
        flexDirection: 'row',
    },
    error: {
        color: PostPriorityColors.URGENT,
        marginLeft: 7,
    },
});

export default function DraftInputHeader({
    postPriority,
    noMentionsError,
}: Props) {
    const theme = useTheme();

    return (
        <View style={style.container}>
            <View style={style.labelContainer}>
                <PostPriorityLabel label={postPriority!.priority}/>
            </View>
            {postPriority.requested_ack && (
                <View style={style.ackContainer}>
                    <CompassIcon
                        color={theme.onlineIndicator}
                        name='check-circle-outline'
                        size={14}
                    />
                </View>
            )}
            {postPriority.persistent_notifications && (
                <View style={style.notificationsContainer}>
                    <CompassIcon
                        color={PostPriorityColors.URGENT}
                        name='bell-ring-outline'
                        size={14}
                    />
                    {noMentionsError && (
                        <FormattedText
                            id='persistent_notifications.error.no_mentions.title'
                            defaultMessage='Recipients must be @mentioned'
                            style={style.error}
                        />
                    )}
                </View>
            )}

        </View>
    );
}
