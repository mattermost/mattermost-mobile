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
    postPriority: PostPriorityMetadata;
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
    ackContainer: {
        marginLeft: 7,
    },
    notificationsContainer: {
        flexDirection: 'row',
        marginLeft: 7,
    },
    error: {
        color: PostPriorityColors.URGENT,
    },
});

export default function DraftInputHeader({
    postPriority,
    noMentionsError,
}: Props) {
    const theme = useTheme();

    if (!postPriority?.priority) {
        return null;
    }

    return (
        <View style={style.container}>
            <PostPriorityLabel label={postPriority!.priority}/>
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
                            id='persistent_notifications.error.no_mentions'
                            defaultMessage='Recipients must be @mentioned'
                            style={style.error}
                        />
                    )}
                </View>
            )}

        </View>
    );
}
