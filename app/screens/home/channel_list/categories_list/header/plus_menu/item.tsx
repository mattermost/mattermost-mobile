// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import SlideUpPanelItem from '@components/slide_up_panel_item';

type PlusMenuItemProps = {
    pickerAction: 'browseChannels' | 'createNewChannel' | 'openDirectMessage' | 'invitePeopleToTeam';
    onPress: () => void;
};

const PlusMenuItem = ({pickerAction, onPress}: PlusMenuItemProps) => {
    const intl = useIntl();

    const menuItems: {[key: string]: Omit<React.ComponentProps<typeof SlideUpPanelItem>, 'onPress'>} = {
        browseChannels: {
            leftIcon: 'globe',
            text: intl.formatMessage({id: 'plus_menu.browse_channels.title', defaultMessage: 'Browse Channels'}),
            testID: 'plus_menu_item.browse_channels',
        },

        createNewChannel: {
            leftIcon: 'plus',
            text: intl.formatMessage({id: 'plus_menu.create_new_channel.title', defaultMessage: 'Create New Channel'}),
            testID: 'plus_menu_item.create_new_channel',
        },

        openDirectMessage: {
            leftIcon: 'account-outline',
            text: intl.formatMessage({id: 'plus_menu.open_direct_message.title', defaultMessage: 'Open a Direct Message'}),
            testID: 'plus_menu_item.open_direct_message',
        },
        invitePeopleToTeam: {
            leftIcon: 'account-plus-outline',
            text: intl.formatMessage({id: 'plus_menu.invite_people_to_team.title', defaultMessage: 'Invite people to the team'}),
            testID: 'plus_menu_item.invite_people_to_team',
        },
    };

    const itemType = menuItems[pickerAction];

    return (
        <SlideUpPanelItem
            {...itemType}
            onPress={onPress}
        />
    );
};

export default PlusMenuItem;
