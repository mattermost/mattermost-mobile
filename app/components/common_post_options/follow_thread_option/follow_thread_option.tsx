// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, type MessageDescriptor} from 'react-intl';

import {updateThreadFollowing} from '@actions/remote/thread';
import {BaseOption} from '@components/common_post_options';
import {useServerUrl} from '@context/server';
import {dismissBottomSheet} from '@screens/navigation';

import type ThreadModel from '@typings/database/models/servers/thread';
import type {AvailableScreens} from '@typings/screens/navigation';

type FollowThreadOptionProps = {
    bottomSheetId: AvailableScreens;
    thread: ThreadModel;
    teamId?: string;
};

const messages = defineMessages({
    unfollowThread: {
        id: 'threads.unfollowThread',
        defaultMessage: 'Unfollow Thread',
    },
    followThread: {
        id: 'threads.followThread',
        defaultMessage: 'Follow Thread',
    },
    followMessage: {
        id: 'threads.followMessage',
        defaultMessage: 'Follow Message',
    },
    unfollowMessage: {
        id: 'threads.unfollowMessage',
        defaultMessage: 'Unfollow Message',
    },
});
const FollowThreadOption = ({bottomSheetId, thread, teamId}: FollowThreadOptionProps) => {
    let message: MessageDescriptor;
    let icon: string;

    if (thread.isFollowing) {
        icon = 'message-minus-outline';
        if (thread.replyCount) {
            message = messages.unfollowThread;
        } else {
            message = messages.unfollowMessage;
        }
    } else {
        icon = 'message-plus-outline';
        if (thread.replyCount) {
            message = messages.followThread;
        } else {
            message = messages.followMessage;
        }
    }

    const serverUrl = useServerUrl();

    const handleToggleFollow = useCallback(async () => {
        if (teamId == null) {
            return;
        }
        await dismissBottomSheet(bottomSheetId);
        updateThreadFollowing(serverUrl, teamId, thread.id, !thread.isFollowing, true);
    }, [bottomSheetId, serverUrl, teamId, thread.id, thread.isFollowing]);

    const followThreadOptionTestId = thread.isFollowing ? 'post_options.following_thread.option' : 'post_options.follow_thread.option';

    return (
        <BaseOption
            message={message}
            testID={followThreadOptionTestId}
            iconName={icon}
            onPress={handleToggleFollow}
        />
    );
};

export default FollowThreadOption;
