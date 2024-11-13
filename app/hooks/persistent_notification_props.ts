// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useMemo} from 'react';

import {General} from '@constants';
import {MENTIONS_REGEX} from '@constants/autocomplete';
import {PostPriorityType} from '@constants/post';

type Props = {
    value: string;
    channelType: ChannelType | undefined;
    postPriority: PostPriority;
}

export const usePersistentNotificationProps = ({
    value,
    channelType,
    postPriority,
}: Props) => {
    const persistentNotificationsEnabled = postPriority.persistent_notifications && postPriority.priority === PostPriorityType.URGENT;
    const {noMentionsError, mentionsList} = useMemo(() => {
        let error = false;
        let mentions: string[] = [];
        if (
            channelType !== General.DM_CHANNEL &&
            persistentNotificationsEnabled
        ) {
            mentions = (value.match(MENTIONS_REGEX) || []);
            error = mentions.length === 0;
        }

        return {noMentionsError: error, mentionsList: mentions};
    }, [channelType, persistentNotificationsEnabled, value]);

    return {
        noMentionsError,
        mentionsList,
        persistentNotificationsEnabled,
    };
};
