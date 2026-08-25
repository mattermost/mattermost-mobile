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

    // Await the dismissal before switching the list. Firing both in the same tick let the
    // parent re-render its rows while this sheet's views were still mounted, and Fabric
    // then tried to insert a ReactTextView that still had the dismissing sheet as its
    // parent: "addViewAt: cannot insert view into parent: View already has a parent".
    // That is a host exception, so ReactHost destroyed the instance and the app became a
    // zombie — the whole archived-channel spec then died on 300s Detox idle timeouts
    // (MM-T1671_1 and the three beforeEach hooks after it, Android shard 14 on f181296).
    // Every other slide-up menu in the app already awaits first; this one was the outlier.
    const handlePublicPress = useCallback(async () => {
        await dismissBottomSheet();
        onPress(PUBLIC);
    }, [onPress]);

    const handleArchivedPress = useCallback(async () => {
        await dismissBottomSheet();
        onPress(ARCHIVED);
    }, [onPress]);

    const handleSharedPress = useCallback(async () => {
        await dismissBottomSheet();
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
                rightIcon={selected === PUBLIC ? 'check' : undefined}
                rightIconStyles={style.checkIcon}
            />
            {canShowArchivedChannels && (
                <SlideUpPanelItem
                    onPress={handleArchivedPress}
                    testID='browse_channels.dropdown_slideup_item.archived_channels'
                    text={intl.formatMessage({id: 'browse_channels.archivedChannels', defaultMessage: 'Archived Channels'})}
                    rightIcon={selected === ARCHIVED ? 'check' : undefined}
                    rightIconStyles={style.checkIcon}
                />
            )}
            {sharedChannelsEnabled && (
                <SlideUpPanelItem
                    onPress={handleSharedPress}
                    testID='browse_channels.dropdown_slideup_item.shared_channels'
                    text={intl.formatMessage({id: 'browse_channels.sharedChannels', defaultMessage: 'Shared Channels'})}
                    rightIcon={selected === SHARED ? 'check' : undefined}
                    rightIconStyles={style.checkIcon}
                />
            )}
        </BottomSheetContent>
    );
}
