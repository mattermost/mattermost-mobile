// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import SlideUpPanelItem from '@app/components/slide_up_panel_item';

type PlusMenuItemProps = {
    pickerAction: 'browseChannels' | 'createNewChannel' | 'openDirectMessage';
    onPress: () => void;
};

const PlusMenuList = ({pickerAction, onPress}: PlusMenuItemProps) => {
    const menuItems = {
        browseChannels: {
            icon: 'globe',
            text: 'Browse Channels',
        },

        createNewChannel: {
            icon: 'plus',
            text: 'Create New Channel',
            onPress: {},
        },

        openDirectMessage: {
            icon: 'account-outline',
            text: 'Open a Direct Message',
            onPress: {},
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

export default PlusMenuList;
