// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View, Text} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {
    makeStyleSheetFromTheme,
} from '@utils/theme';
import {typography} from '@utils/typography';

import {showModalOverCurrentContext} from '../navigation';

import {PUBLIC, SHARED} from './constants';
import DropdownSlideup from './dropdown_slideup';

type Props = {
    typeOfChannels: string;
    onPress: (channelType: string) => void;
    canShowArchivedChannels: boolean;
    sharedChannelsEnabled: boolean;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        channelDropdown: {
            ...typography('Body', 100, 'SemiBold'),
            lineHeight: 20,
            color: theme.centerChannelColor,
            marginLeft: 20,
            marginTop: 12,
            marginBottom: 4,
        },
        channelDropdownIcon: {
            color: theme.centerChannelColor,
        },
    };
});

const ITEM_HEIGHT = 100;

export function ChannelDropdown({
    typeOfChannels,
    onPress,
    canShowArchivedChannels,
    sharedChannelsEnabled,
}: Props) {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    // Depends on all props, so no need to use a callback.
    const handleDropdownClick = () => {
        const renderContent = () => {
            return (
                <DropdownSlideup
                    canShowArchivedChannels={canShowArchivedChannels}
                    onPress={onPress}
                    sharedChannelsEnabled={sharedChannelsEnabled}
                    selected={typeOfChannels}
                />
            );
        };

        let items = 2;
        if (canShowArchivedChannels) {
            items += 1;
        }
        if (sharedChannelsEnabled) {
            items += 1;
        }

        showModalOverCurrentContext('BottomSheet', {
            renderContent,
            snapPoints: [items * ITEM_HEIGHT, 10],
        });
    };

    let channelDropdownText;
    if (typeOfChannels === PUBLIC) {
        channelDropdownText = intl.formatMessage({id: 'more_channels.showPublicChannels', defaultMessage: 'Show: Public Channels'});
    } else if (typeOfChannels === SHARED) {
        channelDropdownText = intl.formatMessage({id: 'more_channels.showSharedChannels', defaultMessage: 'Show: Shared Channels'});
    } else {
        channelDropdownText = intl.formatMessage({id: 'more_channels.showArchivedChannels', defaultMessage: 'Show: Archived Channels'});
    }
    return (
        <View
            testID='more_channels.channel.dropdown'
        >
            <Text
                accessibilityRole={'button'}
                style={style.channelDropdown}
                onPress={handleDropdownClick}
                testID={`more_channels.channel.dropdown.${typeOfChannels}`}
            >
                {channelDropdownText}
                {'  '}
                <CompassIcon
                    name='menu-down'
                    size={18}
                    style={style.channelDropdownIcon}
                />
            </Text>
        </View>
    );
}
