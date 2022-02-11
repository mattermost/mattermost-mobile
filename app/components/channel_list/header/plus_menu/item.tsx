// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

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
        },

        createNewChannel: {
            icon: 'plus',
            text: intl.formatMessage({id: 'plus_menu.create_new_channel.title', defaultMessage: 'Create New Channel'}),
        },

        openDirectMessage: {
            icon: 'account-outline',
            text: intl.formatMessage({id: 'plus_menu.open_direct_message.title', defaultMessage: 'Open a Direct Message'}),
        },
    };
    const itemType = menuItems[pickerAction];
    return (
        <View>
            <SlideUpPanelItem
                text={itemType.text}
                icon={itemType.icon}
                onPress={onPress}
            />
        </View>
    );
};

export default PlusMenuItem;
