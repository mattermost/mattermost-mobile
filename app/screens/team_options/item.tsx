// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import OptionItem from '@components/option_item';

type TeamOptionItemProps = {
    pickerAction: 'browseChannels' | 'createNewChannel' | 'openDirectMessage' | 'invitePeopleToTeam';
    onPress: () => void;
};

const TeamOptionItem = ({pickerAction, onPress}: TeamOptionItemProps) => {
    const intl = useIntl();

    const menuItems: {[key: string]: Omit<React.ComponentProps<typeof OptionItem>, 'action' | 'type'>} = {
        browseChannels: {
            icon: 'globe',
            label: intl.formatMessage({id: 'plus_menu.browse_channels.title', defaultMessage: 'Browse Channels'}),
            testID: 'plus_menu_item.browse_channels',
        },

        createNewChannel: {
            icon: 'plus',
            label: intl.formatMessage({id: 'plus_menu.create_new_channel.title', defaultMessage: 'Create New Channel'}),
            testID: 'plus_menu_item.create_new_channel',
        },

        openDirectMessage: {
            icon: 'account-outline',
            label: intl.formatMessage({id: 'plus_menu.open_direct_message.title', defaultMessage: 'Open a Direct Message'}),
            testID: 'plus_menu_item.open_direct_message',
        },
        invitePeopleToTeam: {
            icon: 'account-plus-outline',
            label: intl.formatMessage({id: 'plus_menu.invite_people_to_team.title', defaultMessage: 'Invite people to the team'}),
            testID: 'plus_menu_item.invite_people_to_team',
        },
    };

    const itemType = menuItems[pickerAction];

    return (
        <OptionItem
            {...itemType}
            action={onPress}
            type='default'
        />
    );
};

export default TeamOptionItem;
