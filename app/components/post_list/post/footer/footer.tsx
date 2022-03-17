// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';

import {updateThreadFollow} from '@actions/remote/thread';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import UserAvatarsStack from '@components/user_avatars_stack';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type ThreadModel from '@typings/database/models/servers/thread';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUserId: string;
    participants: UserModel[];
    serverUrl: string;
    teamId: string;
    teammateNameDisplay: string;
    testID: string;
    theme: Theme;
    thread: ThreadModel;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const followingButtonContainerBase = {
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
            fontSize: 12,
            fontWeight: '600',
            marginRight: 12,
        },
        notFollowingButtonContainer: {
            ...followingButtonContainerBase,
            paddingLeft: 0,
        },
        notFollowing: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            fontWeight: '600',
            fontSize: 12,
        },
        followingButtonContainer: {
            ...followingButtonContainerBase,
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
            borderRadius: 4,
        },
        following: {
            color: theme.buttonBg,
            fontWeight: '600',
            fontSize: 12,
        },
        followSeparator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.16),
            height: 16,
            marginRight: 12,
            width: 1,
        },
    };
});

const Footer = ({currentUserId, participants, serverUrl, teamId, teammateNameDisplay, testID, theme, thread}: Props) => {
    const styles = getStyleSheet(theme);
    const onUnfollow = useCallback(preventDoubleTap(() => {
        updateThreadFollow(serverUrl, teamId, thread.id, false);
    }), []);

    const onFollow = useCallback(preventDoubleTap(() => {
        updateThreadFollow(serverUrl, teamId, thread.id, true);
    }), []);

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
                    testID={`${testID}.reply_count`}
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
                onPress={onUnfollow}
                style={styles.followingButtonContainer}
                testID={`${testID}.following`}
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
                    onPress={onFollow}
                    style={styles.notFollowingButtonContainer}
                    testID={`${testID}.follow`}
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

    // threadstarter should be the first one in the avatars list
    const participantsList = useMemo(() => {
        if (participants?.length) {
            const filteredParticipantsList = [...participants].reverse();
            return filteredParticipantsList;
        }
        return [];
    }, [participants]);

    let userAvatarsStack;
    if (participantsList.length) {
        userAvatarsStack = (
            <UserAvatarsStack
                currentUserId={currentUserId}
                style={styles.avatarsContainer}
                teammateNameDisplay={teammateNameDisplay}
                users={participantsList}
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
