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

const Members = ({channelId, count}: Props) => {
    const {formatMessage} = useIntl();
    const title = formatMessage({id: 'channel_info.members', defaultMessage: 'Members'});

    const goToChannelMembers = preventDoubleTap(() => {
        goToScreen(Screens.CHANNEL_ADD_PEOPLE, title, {channelId});
    });

    return (
        <OptionItem
            action={goToChannelMembers}
            label={title}
            icon='account-multiple-outline'
            type={Platform.select({ios: 'arrow', default: 'default'})}
            info={count.toString()}
        />
    );
};

export default Members;
