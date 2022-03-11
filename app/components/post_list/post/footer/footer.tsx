// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View, Text} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';

import {updateThreadFollow} from '@actions/remote/thread';
import AvatarsStack from '@components/avatars_stack';
import CompassIcon from '@components/compass_icon';
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

const Footer = ({currentUserId, participants, serverUrl, teamId, teammateNameDisplay, testID, theme, thread}: Props) => {
    const intl = useIntl();
    const style = getStyleSheet(theme);
    const onUnfollow = React.useCallback(preventDoubleTap(() => {
        updateThreadFollow(serverUrl, teamId, thread.id, false);
    }), []);

    const onFollow = React.useCallback(preventDoubleTap(() => {
        updateThreadFollow(serverUrl, teamId, thread.id, true);
    }), []);

    let replyIcon;
    let followButton;
    if (thread.replyCount) {
        replyIcon = (
            <View style={style.replyIconContainer}>
                <CompassIcon
                    name='reply-outline'
                    size={18}
                    color={changeOpacity(theme.centerChannelColor, 0.64)}
                />
            </View>
        );
    }
    if (thread.isFollowing) {
        followButton = (
            <TouchableOpacity
                onPress={preventDoubleTap(onUnfollow)}
                style={style.followingButtonContainer}
                testID={`${testID}.following`}
            >
                <Text style={style.following}>
                    {intl.formatMessage({
                        id: 'threads.following',
                        defaultMessage: 'Following',
                    })}
                </Text>
            </TouchableOpacity>
        );
    } else {
        followButton = (
            <>
                <View style={style.followSeparator}/>
                <TouchableOpacity
                    onPress={preventDoubleTap(onFollow)}
                    style={style.notFollowingButtonContainer}
                    testID={`${testID}.follow`}
                >
                    <Text style={style.notFollowing}>
                        {intl.formatMessage({
                            id: 'threads.follow',
                            defaultMessage: 'Follow',
                        })}
                    </Text>
                </TouchableOpacity>
            </>
        );
    }

    const repliesComponent = (
        <Text
            style={style.replies}
            testID={`${testID}.reply_count`}
        >
            {intl.formatMessage({
                id: 'threads.replies',
                defaultMessage: '{count} {count, plural, one {reply} other {replies}}',
            }, {
                count: thread.replyCount,
            })}
        </Text>
    );

    // threadstarter should be the first one in the avatars list
    const participantsList = React.useMemo(() => {
        if (participants?.length) {
            const filteredParticipantsList = [...participants].reverse();
            return filteredParticipantsList;
        }
        return [];
    }, [participants]);

    let avatars;
    if (participantsList.length) {
        avatars = (
            <AvatarsStack
                currentUserId={currentUserId}
                style={style.avatarsContainer}
                teammateNameDisplay={teammateNameDisplay}
                users={participantsList}
            />
        );
    }

    return (
        <View style={style.container}>
            {avatars}
            {replyIcon}
            {repliesComponent}
            {followButton}
        </View>
    );
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

export default Footer;
