// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {defineMessage} from 'react-intl';
import {TouchableOpacity, View, type ViewStyle} from 'react-native';

import {updateThreadFollowing} from '@actions/remote/thread';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import UserAvatarsStack from '@components/user_avatars_stack';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type ThreadModel from '@typings/database/models/servers/thread';
import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    channelId: string;
    location: AvailableScreens;
    participants: UserModel[];
    teamId?: string;
    thread: ThreadModel;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const followingButtonContainerBase: ViewStyle = {
        justifyContent: 'center',
        height: 32,
        paddingHorizontal: 12,
    };

    return {
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 40,
        },
        avatarsContainer: {
            marginRight: 12,
            paddingVertical: 8,
        },
        replyIconContainer: {
            top: -1,
            marginRight: 5,
        },
        replies: {
            alignSelf: 'center',
            color: changeOpacity(theme.centerChannelColor, 0.64),
            marginRight: 12,
            ...typography('Heading', 75),
        },
        notFollowingButtonContainer: {
            ...followingButtonContainerBase,
            paddingLeft: 0,
        },
        notFollowing: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Heading', 75),
        },
        followingButtonContainer: {
            ...followingButtonContainerBase,
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
            borderRadius: 4,
        },
        following: {
            color: theme.buttonBg,
            ...typography('Heading', 75),
        },
        followSeparator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.16),
            height: 16,
            marginRight: 12,
            width: 1,
        },
    };
});

const bottomSheetTitleMessage = defineMessage({id: 'mobile.participants.header', defaultMessage: 'Thread Participants'});

const Footer = ({channelId, location, participants, teamId, thread}: Props) => {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const toggleFollow = usePreventDoubleTap(useCallback(() => {
        if (teamId == null) {
            return;
        }
        updateThreadFollowing(serverUrl, teamId, thread.id, !thread.isFollowing, true);
    }, [serverUrl, teamId, thread.id, thread.isFollowing]));

    let repliesComponent;
    let followButton;
    if (thread.replyCount) {
        repliesComponent = (
            <>
                <View style={styles.replyIconContainer}>
                    <CompassIcon
                        name='reply-outline'
                        size={18}
                        color={changeOpacity(theme.centerChannelColor, 0.64)}
                    />
                </View>
                <FormattedText
                    style={styles.replies}
                    testID='post_footer.reply_count'
                    id='threads.replies'
                    defaultMessage='{count} {count, plural, one {reply} other {replies}}'
                    values={{
                        count: thread.replyCount,
                    }}
                />
            </>
        );
    }
    if (thread.isFollowing) {
        followButton = (
            <TouchableOpacity
                onPress={toggleFollow}
                style={styles.followingButtonContainer}
                testID='post_footer.following_thread.button'
            >
                <FormattedText
                    id='threads.following'
                    defaultMessage='Following'
                    style={styles.following}
                />
            </TouchableOpacity>
        );
    } else {
        followButton = (
            <>
                <View style={styles.followSeparator}/>
                <TouchableOpacity
                    onPress={toggleFollow}
                    style={styles.notFollowingButtonContainer}
                    testID='post_footer.follow_thread.button'
                >
                    <FormattedText
                        id='threads.follow'
                        defaultMessage='Follow'
                        style={styles.notFollowing}
                    />
                </TouchableOpacity>
            </>
        );
    }

    const participantsList = useMemo(() => {
        if (participants?.length) {
            const orderedParticipantsList = [...participants].reverse();
            return orderedParticipantsList;
        }
        return [];
    }, [participants]);

    let userAvatarsStack;
    if (participantsList.length) {
        userAvatarsStack = (
            <UserAvatarsStack
                channelId={channelId}
                location={location}
                style={styles.avatarsContainer}
                users={participantsList}
                bottomSheetTitle={bottomSheetTitleMessage}
            />
        );
    }

    return (
        <View style={styles.container}>
            {userAvatarsStack}
            {repliesComponent}
            {followButton}
        </View>
    );
};

export default Footer;
