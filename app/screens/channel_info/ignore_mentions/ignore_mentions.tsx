// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useState} from 'react';

import {Users} from '@mm-redux/constants';
import {Theme} from '@mm-redux/types/preferences';
import ChannelInfoRow from '@screens/channel_info/channel_info_row';
import {t} from '@utils/i18n';
import {preventDoubleTap} from '@utils/tap';

interface IgnoreMentionsProps {
    testID?: string;
    channelId: string;
    ignore: boolean;
    isLandscape: boolean;
    theme: Theme;
    updateChannelNotifyProps: (userId: string, channelId: string, opts: {ignore_channel_mentions: string}) => void;
    userId: string;
}

const IgnoreMentions = ({testID, channelId, ignore, isLandscape, updateChannelNotifyProps, userId, theme}: IgnoreMentionsProps) => {
    const [mentions, setMentions] = useState(ignore);

    const handleIgnoreChannelMentions = preventDoubleTap(() => {
        const opts = {
            ignore_channel_mentions: ignore ? Users.IGNORE_CHANNEL_MENTIONS_OFF : Users.IGNORE_CHANNEL_MENTIONS_ON,
        };

        setMentions(!mentions);
        updateChannelNotifyProps(userId, channelId, opts);
    });

    return (
        <ChannelInfoRow
            testID={testID}
            action={handleIgnoreChannelMentions}
            defaultMessage='Ignore @channel, @here, @all'
            detail={ignore}
            icon='at'
            textId={t('channel_notifications.ignoreChannelMentions.settings')}
            togglable={true}
            theme={theme}
            isLandscape={isLandscape}
        />
    );
};

export default memo(IgnoreMentions);