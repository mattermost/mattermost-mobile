// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {updateThreadFollowing} from '@actions/remote/thread';
import {BaseOption} from '@components/common_post_options';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';

import type ThreadModel from '@typings/database/models/servers/thread';

type FollowThreadOptionProps = {
    thread: ThreadModel;
    teamId?: string;
};

const FollowThreadOption = ({thread, teamId}: FollowThreadOptionProps) => {
    let id: string;
    let defaultMessage: string;
    let icon: string;

    if (thread.isFollowing) {
        icon = 'message-minus-outline';
        if (thread.replyCount) {
            id = t('threads.unfollowThread');
            defaultMessage = 'Unfollow Thread';
        } else {
            id = t('threads.unfollowMessage');
            defaultMessage = 'Unfollow Message';
        }
    } else {
        icon = 'message-plus-outline';
        if (thread.replyCount) {
            id = t('threads.followThread');
            defaultMessage = 'Follow Thread';
        } else {
            id = t('threads.followMessage');
            defaultMessage = 'Follow Message';
        }
    }

    const serverUrl = useServerUrl();

    const handleToggleFollow = () => {
        if (teamId == null) {
            return;
        }
        updateThreadFollowing(serverUrl, teamId, thread.id, !thread.isFollowing);
        dismissBottomSheet(Screens.POST_OPTIONS);
    };

    const followThreadOptionTestId = thread.isFollowing ? 'post_options.following_thread.option' : 'post_options.follow_thread.option';

    return (
        <BaseOption
            i18nId={id}
            defaultMessage={defaultMessage}
            testID={followThreadOptionTestId}
            iconName={icon}
            onPress={handleToggleFollow}
        />
    );
};

export default FollowThreadOption;
