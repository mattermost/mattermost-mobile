// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import PostPriorityLabel from '@components/post_priority/post_priority_label';
import {PostPriorityColors} from '@constants/post';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    postPriority: PostPriority;
    noMentionsError: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
        gap: 7,
    },
    error: {
        color: PostPriorityColors.URGENT,
    },
    acknowledgements: {
        color: theme.onlineIndicator,
    },
    paddingTopStyle: {
        paddingTop: Platform.select({ios: 6, android: 8}),
    },
}));

export default function DraftInputHeader({
    postPriority,
    noMentionsError,
}: Props) {
    const theme = useTheme();
    const hasLabels = postPriority.priority !== '' || postPriority.requested_ack;
    const style = getStyleSheet(theme);

    return (
        <View style={[style.container, hasLabels ? style.paddingTopStyle : undefined]}>
            {postPriority.priority && (
                <PostPriorityLabel label={postPriority.priority}/>
            )}
            {postPriority.requested_ack && (
                <>
                    <CompassIcon
                        testID='drafts.requested_ack.icon'
                        color={theme.onlineIndicator}
                        name='check-circle-outline'
                        size={14}
                    />
                    {!postPriority.priority && (
                        <FormattedText
                            testID='requested_ack.title'
                            id='requested_ack.title'
                            defaultMessage='Request Acknowledgements'
                            style={{color: theme.onlineIndicator}}
                        />
                    )}
                </>
            )}
            {postPriority.persistent_notifications && (
                <>
                    <CompassIcon
                        testID='drafts.persistent_notifications.icon'
                        color={PostPriorityColors.URGENT}
                        name='bell-ring-outline'
                        size={14}
                    />
                    {noMentionsError && (
                        <FormattedText
                            testID='drafts.persistent_notifications.error.no_mentions.title'
                            id='persistent_notifications.error.no_mentions.title'
                            defaultMessage='Recipients must be @mentioned'
                            style={style.error}
                        />
                    )}
                </>
            )}
        </View>
    );
}
