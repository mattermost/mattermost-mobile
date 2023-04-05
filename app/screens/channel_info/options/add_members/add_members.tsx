// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {getHeaderOptions} from '@screens/channel_add_members/channel_add_members';
import {goToScreen} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    channelId: string;
    displayName: string;
}

const AddMembers = ({displayName, channelId}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const title = formatMessage({id: 'channel_info.add_members', defaultMessage: 'Add members'});

    const goToAddMembers = preventDoubleTap(async () => {
        const options = await getHeaderOptions(theme, displayName, true);
        goToScreen(Screens.CHANNEL_ADD_MEMBERS, title, {channelId, inModal: true}, options);
    });

    return (
        <OptionItem
            action={goToAddMembers}
            label={title}
            icon='account-plus-outline'
            type={Platform.select({ios: 'arrow', default: 'default'})}
            testID='channel_info.options.add_members.option'
        />
    );
};

export default AddMembers;
