// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import SlideUpPanelItem from '@components/slide_up_panel_item';
import {Events} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import BottomSheetContent from '@screens/bottom_sheet/content';
import {
    makeStyleSheetFromTheme,

} from '@utils/theme';

import {ARCHIVED, PUBLIC, SHARED} from './browse_channels';

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
    const isTablet = useIsTablet();

    const commonProps = {
        rightIcon: true,
        imageStyles: style.checkIcon,
    };

    const handlePublicPress = useCallback(() => {
        DeviceEventEmitter.emit(Events.CLOSE_BOTTOM_SHEET);
        onPress(PUBLIC);
    }, [onPress]);

    const handleArchivedPress = useCallback(() => {
        DeviceEventEmitter.emit(Events.CLOSE_BOTTOM_SHEET);
        onPress(ARCHIVED);
    }, [onPress]);

    const handleSharedPress = useCallback(() => {
        DeviceEventEmitter.emit(Events.CLOSE_BOTTOM_SHEET);
        onPress(SHARED);
    }, [onPress]);

    return (
        <BottomSheetContent
            showButton={false}
            showTitle={!isTablet}
            title={intl.formatMessage({id: 'browse_channels.dropdownTitle', defaultMessage: 'Show'})}
        >
            <SlideUpPanelItem
                onPress={handlePublicPress}
                testID='browse_channels.dropdownTitle.public'
                text={intl.formatMessage({id: 'browse_channels.publicChannels', defaultMessage: 'Public Channels'})}
                icon={selected === PUBLIC ? 'check' : undefined}
                {...commonProps}
            />
            {canShowArchivedChannels && (
                <SlideUpPanelItem
                    onPress={handleArchivedPress}
                    testID='browse_channels.dropdownTitle.public'
                    text={intl.formatMessage({id: 'browse_channels.archivedChannels', defaultMessage: 'Archived Channels'})}
                    icon={selected === ARCHIVED ? 'check' : undefined}
                    {...commonProps}
                />
            )}
            {sharedChannelsEnabled && (
                <SlideUpPanelItem
                    onPress={handleSharedPress}
                    testID='browse_channels.dropdownTitle.public'
                    text={intl.formatMessage({id: 'browse_channels.sharedChannels', defaultMessage: 'Shared Channels'})}
                    icon={selected === SHARED ? 'check' : undefined}
                    {...commonProps}
                />
            )}
        </BottomSheetContent>
    );
}
