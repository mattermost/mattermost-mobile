// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';

import DrawerItem from '@components/drawer_item';
import FormattedText from '@components/formatted_text';
import * as Screens from '@constants/screens';
import {t} from '@i18n';

type FollowThreadOptionProps = {
    thread?: any;
    theme: Theme;
    location?: typeof Screens[keyof typeof Screens];
};

//todo: to implement CRT follow thread

const FollowThreadOption = ({
    thread = undefined,
    theme,
}: FollowThreadOptionProps) => {
    //todo: to enable after CRT
    // if (location !== Screens.CHANNEL || !thread) {
    //     return null;
    // }

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
        <DrawerItem
            testID='post.options.follow.thread'
            labelComponent={
                <FormattedText
                    id={config.id}
                    defaultMessage={config.defaultMessage}
                />
            }
            iconName={config.icon}
            onPress={handleToggleFollow}
            separator={false}
            theme={theme}
        />
    );
};

export default FollowThreadOption;
