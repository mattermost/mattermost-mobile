// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import SlideUpPanelItem from '@components/slide_up_panel_item';

type PlusMenuItemProps = {
    pickerAction: 'browseChannels' | 'createNewChannel' | 'openDirectMessage';
    onPress: () => void;
};

const PlusMenuItem = ({pickerAction, onPress}: PlusMenuItemProps) => {
    const intl = useIntl();

    const menuItems = {
        browseChannels: {
            icon: 'globe',
            text: intl.formatMessage({id: 'plus_menu.browse_channels.title', defaultMessage: 'Browse Channels'}),
            testID: 'plus_menu_item.browse_channels',
        },

        createNewChannel: {
            icon: 'plus',
            text: intl.formatMessage({id: 'plus_menu.create_new_channel.title', defaultMessage: 'Create New Channel'}),
            testID: 'plus_menu_item.create_new_channel',
        },

        openDirectMessage: {
            icon: 'account-outline',
            text: intl.formatMessage({id: 'plus_menu.open_direct_message.title', defaultMessage: 'Open a Direct Message'}),
            testID: 'plus_menu_item.open_direct_message',
        },
    };
    const itemType = menuItems[pickerAction];
    return (
        <SlideUpPanelItem
            text={itemType.text}
            icon={itemType.icon}
            onPress={onPress}
            testID={itemType.testID}
        />
    );
};

export default PlusMenuItem;
