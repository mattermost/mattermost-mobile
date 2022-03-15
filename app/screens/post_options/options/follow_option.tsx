// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {Screens} from '@constants';
import {t} from '@i18n';
import {showToast} from '@screens/post_options/helper';
import {SNACK_BAR_TYPE} from '@screens/snack_bar/constants';

import BaseOption from './base_option';

type FollowThreadOptionProps = {
    thread?: any;
    location?: typeof Screens[keyof typeof Screens];
};

//todo: to implement CRT follow thread

const FollowThreadOption = ({thread}: FollowThreadOptionProps) => {
    let id: string;
    let defaultMessage: string;
    let icon: string;

    if (thread.is_following) {
        icon = 'message-minus-outline';
        if (thread?.participants?.length) {
            id = t('threads.unfollowThread');
            defaultMessage = 'Unfollow Thread';
        } else {
            id = t('threads.unfollowMessage');
            defaultMessage = 'Unfollow Message';
        }
    } else {
        icon = 'message-plus-outline';
        if (thread?.participants?.length) {
            id = t('threads.followThread');
            defaultMessage = 'Follow Thread';
        } else {
            id = t('threads.followMessage');
            defaultMessage = 'Follow Message';
        }
    }

    const unFollowThread = useCallback(() => {
        // eslint-disable-next-line no-console
        console.log('TO IMPLEMENT UNFOLLOW THREAD');
    }, []);

    const handleToggleFollow = () => {
        //todo:

        showToast(SNACK_BAR_TYPE.FOLLOW_THREAD, unFollowThread);
    };

    return (
        <BaseOption
            i18nId={id}
            defaultMessage={defaultMessage}
            testID='post.options.follow.thread'
            iconName={icon}
            onPress={handleToggleFollow}
        />
    );
};

export default FollowThreadOption;
