// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {goToScreen} from '@screens/navigation';
import {changeOpacity} from '@utils/theme';

type Props = {
    channelId: string;
    displayName: string;
    count: number;
}

const Members = ({displayName, channelId, count}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const title = formatMessage({id: 'channel_info.members', defaultMessage: 'Members'});
    const goToChannelMembers = usePreventDoubleTap(useCallback(() => {
        const options = {
            topBar: {
                subtitle: {
                    color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
                    text: displayName,
                },
            },
        };

        goToScreen(Screens.MANAGE_CHANNEL_MEMBERS, title, {channelId}, options);
    }, [channelId, displayName, theme.sidebarHeaderTextColor, title]));

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
