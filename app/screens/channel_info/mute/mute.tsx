// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useState} from 'react';

import {Theme} from '@mm-redux/types/preferences';
import ChannelInfoRow from '@screens/channel_info/channel_info_row';
import {t} from '@utils/i18n';
import {preventDoubleTap} from '@utils/tap';

interface MuteProps {
    testID?: string;
    channelId: string;
    isChannelMuted: boolean;
    theme: Theme;
    updateChannelNotifyProps: (userId: string, channelId: string, opts: {mark_unread: string}) => void;
    userId: string;
}

const Mute = ({channelId, isChannelMuted, updateChannelNotifyProps, userId, testID, theme}: MuteProps) => {
    const [muted, setMuted] = useState(isChannelMuted);

    const handleMuteChannel = preventDoubleTap(() => {
        const opts = {
            mark_unread: muted ? 'all' : 'mention',
        };

        setMuted(!muted);
        updateChannelNotifyProps(userId, channelId, opts);
    });

    return (
        <ChannelInfoRow
            testID={testID}
            action={handleMuteChannel}
            defaultMessage='Mute channel'
            detail={muted}
            icon='bell-off-outline'
            textId={t('channel_notifications.muteChannel.settings')}
            togglable={true}
            theme={theme}
        />
    );
};

export default memo(Mute);
