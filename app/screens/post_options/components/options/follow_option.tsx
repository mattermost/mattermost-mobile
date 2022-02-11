// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';

import {Screens} from '@constants';
import {t} from '@i18n';

import BaseOption from './base_option';

type FollowThreadOptionProps = {
    thread?: any;
    location?: typeof Screens[keyof typeof Screens];
};

//todo: to implement CRT follow thread

const FollowThreadOption = ({thread}: FollowThreadOptionProps) => {
    //todo: to enable after CRT. Move this to PostOptions and do not mount the component
    const config = useMemo(() => {
        if (thread?.is_following) {
            if (thread?.participants?.length) {
                return {
                    id: t('threads.unfollowThread'),
                    defaultMessage: 'Unfollow Thread',
                    icon: 'message-minus-outline',
                };
            }
            return {
                id: t('threads.unfollowMessage'),
                defaultMessage: 'Unfollow Message',
                icon: 'message-minus-outline',
            };
        }

        if (thread?.participants?.length) {
            return {
                id: t('threads.followThread'),
                defaultMessage: 'Follow Thread',
                icon: 'message-plus-outline',
            };
        }
        return {
            id: t('threads.followMessage'),
            defaultMessage: 'Follow Message',
            icon: 'message-plus-outline',
        };
    }, [thread?.is_following, thread?.participants]);

    const handleToggleFollow = () => {
        //todo:
    };

    return (
        <BaseOption
            i18nId={config.id}
            defaultMessage={config.defaultMessage}
            testID='post.options.follow.thread'
            iconName={config.icon}
            onPress={handleToggleFollow}
        />
    );
};

export default FollowThreadOption;
