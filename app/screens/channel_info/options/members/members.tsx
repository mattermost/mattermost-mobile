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
    displayName: string;
    count: number;
}

const Members = ({displayName, channelId, count}: Props) => {
    const {formatMessage} = useIntl();
    const title = formatMessage({id: 'channel_info.members', defaultMessage: 'Members'});
    const goToChannelMembers = usePreventDoubleTap(useCallback(() => {
        navigateToChannelInfoScreen(Screens.MANAGE_CHANNEL_MEMBERS, {channelId, displayName});
    }, [channelId, displayName]));

    return (
        <OptionItem
            action={goToChannelMembers}
            label={title}
            icon='account-multiple-outline'
            type={Platform.select({ios: 'arrow', default: 'default'})}
            info={count.toString()}
            testID='channel_info.options.members.option'
        />
    );
};

export default Members;
