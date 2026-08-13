// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateToChannelInfoScreen} from '@screens/navigation';

type Props = {
    channelId: string;
    count: number;
    displayName: string;
}

const PinnedMessages = ({channelId, count, displayName}: Props) => {
    const {formatMessage} = useIntl();
    const title = formatMessage({id: 'channel_info.pinned_messages', defaultMessage: 'Pinned Messages'});

    const goToPinnedMessages = usePreventDoubleTap(useCallback(() => {
        navigateToChannelInfoScreen(Screens.PINNED_MESSAGES, {channelId, displayName});
    }, [channelId, displayName]));

    return (
        <OptionItem
            action={goToPinnedMessages}
            label={title}
            icon='pin-outline'
            type={Platform.select({ios: 'arrow', default: 'default'})}
            info={count.toString()}
            testID='channel_info.options.pinned_messages.option'
        />
    );
};

export default PinnedMessages;
