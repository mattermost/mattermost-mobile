// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import {goToScreen} from '@app/screens/navigation';
import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    channelId: string;
    count: number;
}

const PinnedMessages = ({channelId, count}: Props) => {
    const {formatMessage} = useIntl();
    const title = formatMessage({id: 'channel_info.pinned_messages', defaultMessage: 'Pinned Messages'});

    const goToPinnedMessages = preventDoubleTap(() => {
        goToScreen(Screens.PINNED_MESSAGES, title, {channelId});
    });

    return (
        <OptionItem
            action={goToPinnedMessages}
            label={title}
            icon='pin-outline'
            type={Platform.select({ios: 'arrow', default: 'default'})}
            info={count.toString()}
        />
    );
};

export default PinnedMessages;
