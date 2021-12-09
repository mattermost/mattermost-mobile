// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import SlideUpPanelItem from '@components/slide_up_panel_item';
import NavigationConstants from '@constants/navigation';
import {useTheme} from '@context/theme';
import {
    makeStyleSheetFromTheme,

} from '@utils/theme';

import BottomSheetContent from '../bottom_sheet/content';

import {ARCHIVED, PUBLIC, SHARED} from './constants';

type Props = {
    onPress: (channelType: string) => void;
    canShowArchivedChannels?: boolean;
    sharedChannelsEnabled?: boolean;
    selected: string;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        checkIcon: {
            color: theme.buttonBg,
        },
    };
});

export default function DropdownSlideup({
    onPress,
    canShowArchivedChannels,
    selected,
    sharedChannelsEnabled,
}: Props) {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const commonProps = {
        rightIcon: true,
        imageStyles: style.checkIcon,
    };
    return (
        <BottomSheetContent
            showButton={false}
            showTitle={true}
            title={intl.formatMessage({id: 'more_channels.dropdownTitle', defaultMessage: 'Show'})}
        >
            <SlideUpPanelItem
                onPress={() => {
                    DeviceEventEmitter.emit(NavigationConstants.NAVIGATION_CLOSE_MODAL);
                    onPress(PUBLIC);
                }}
                testID='more_channels.dropdownTitle.public'
                text={intl.formatMessage({id: 'more_channels.publicChannels', defaultMessage: 'Public Channels'})}
                icon={selected === PUBLIC ? 'check' : undefined}
                {...commonProps}
            />
            {canShowArchivedChannels && (
                <SlideUpPanelItem
                    onPress={() => {
                        DeviceEventEmitter.emit(NavigationConstants.NAVIGATION_CLOSE_MODAL);
                        onPress(ARCHIVED);
                    }}
                    testID='more_channels.dropdownTitle.public'
                    text={intl.formatMessage({id: 'more_channels.archivedChannels', defaultMessage: 'Archived Channels'})}
                    icon={selected === ARCHIVED ? 'check' : undefined}
                    {...commonProps}
                />
            )}
            {sharedChannelsEnabled && (
                <SlideUpPanelItem
                    onPress={() => {
                        DeviceEventEmitter.emit(NavigationConstants.NAVIGATION_CLOSE_MODAL);
                        onPress(SHARED);
                    }}
                    testID='more_channels.dropdownTitle.public'
                    text={intl.formatMessage({id: 'more_channels.sharedChannels', defaultMessage: 'Shared Channels'})}
                    icon={selected === SHARED ? 'check' : undefined}
                    {...commonProps}
                />
            )}
            <SlideUpPanelItem
                destructive={true}
                icon='cancel'
                onPress={() => {
                    DeviceEventEmitter.emit(NavigationConstants.NAVIGATION_CLOSE_MODAL);
                }}
                testID='more_channels.dropdownTitle.cancel'
                text={intl.formatMessage({id: 'more_channels.cancel', defaultMessage: 'Cancel'})}
            />
        </BottomSheetContent>
    );
}
