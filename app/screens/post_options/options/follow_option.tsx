// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {SnackBar} from '@constants';
import {t} from '@i18n';
import {showSnackBar} from '@utils/snack_bar';

import BaseOption from './base_option';

type FollowThreadOptionProps = {
    thread?: any;
};

//todo: to implement CRT follow thread

const {SNACK_BAR_TYPE} = SnackBar;

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

    const undo = useCallback(() => {
        // https://mattermost.atlassian.net/browse/MM-42565
        if (thread.is_following) {
            // eslint-disable-next-line no-console
            console.log('TO IMPLEMENT UNFOLLOW THREAD');
        } else {
            // eslint-disable-next-line no-console
            console.log('TO IMPLEMENT FOLLOW THREAD');
        }
    }, []);

    const handleToggleFollow = () => {
        // https://mattermost.atlassian.net/browse/MM-42565
        if (thread.is_following) {
            // eslint-disable-next-line no-console
            showSnackBar({barType: SNACK_BAR_TYPE.FOLLOW_THREAD, onPress: undo});
        } else {
            // eslint-disable-next-line no-console
            console.log('TO IMPLEMENT FOLLOW THREAD, VALIDATE FROM UX IF A SNACK BAR IS REQUIRED FOR THIS CASE AS WELL');
        }
    };

    return (
        <BaseOption
            i18nId={id}
            defaultMessage={defaultMessage}
            testID='post_options.follow.thread.option'
            iconName={icon}
            onPress={handleToggleFollow}
        />
    );
};

export default FollowThreadOption;
