// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import SlideUpPanelItem from '@components/slide_up_panel_item';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import BottomSheetContent from '@screens/bottom_sheet/content';
import {dismissBottomSheet} from '@screens/navigation';
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
        iconStyles: style.checkIcon,
    };

    const handlePublicPress = useCallback(() => {
        dismissBottomSheet();
        onPress(PUBLIC);
    }, [onPress]);

    const handleArchivedPress = useCallback(() => {
        dismissBottomSheet();
        onPress(ARCHIVED);
    }, [onPress]);

    const handleSharedPress = useCallback(() => {
        dismissBottomSheet();
        onPress(SHARED);
    }, [onPress]);

    return (
        <BottomSheetContent
            showButton={false}
            showTitle={!isTablet}
            testID='browse_channels.dropdown_slideup'
            title={intl.formatMessage({id: 'browse_channels.dropdownTitle', defaultMessage: 'Show'})}
        >
            <SlideUpPanelItem
                onPress={handlePublicPress}
                testID='browse_channels.dropdown_slideup_item.public_channels'
                text={intl.formatMessage({id: 'browse_channels.publicChannels', defaultMessage: 'Public Channels'})}
                icon={selected === PUBLIC ? 'check' : undefined}
                {...commonProps}
            />
            {canShowArchivedChannels && (
                <SlideUpPanelItem
                    onPress={handleArchivedPress}
                    testID='browse_channels.dropdown_slideup_item.archived_channels'
                    text={intl.formatMessage({id: 'browse_channels.archivedChannels', defaultMessage: 'Archived Channels'})}
                    icon={selected === ARCHIVED ? 'check' : undefined}
                    {...commonProps}
                />
            )}
            {sharedChannelsEnabled && (
                <SlideUpPanelItem
                    onPress={handleSharedPress}
                    testID='browse_channels.dropdown_slideup_item.shared_channels'
                    text={intl.formatMessage({id: 'browse_channels.sharedChannels', defaultMessage: 'Shared Channels'})}
                    icon={selected === SHARED ? 'check' : undefined}
                    {...commonProps}
                />
            )}
        </BottomSheetContent>
    );
}
