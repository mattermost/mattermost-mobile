// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ChannelSummarySheet from '@agents/components/channel_summary_sheet';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import OptionItem from '@components/option_item';
import SlideUpPanelItem from '@components/slide_up_panel_item';
import {useTheme} from '@context/theme';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';

type Props = {
    channelId: string;
    showAsLabel?: boolean;
    testID?: string;
}

const AskAgentsOption = ({
    channelId,
    showAsLabel,
    testID,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();

    const label = intl.formatMessage({id: 'agents.channel_summary.ask_agents', defaultMessage: 'Ask Agents'});

    const openSheet = useCallback(async () => {
        // First dismiss the current quick actions bottom sheet
        await dismissBottomSheet();

        const renderContent = () => (
            <ChannelSummarySheet
                channelId={channelId}
            />
        );

        // Use larger snap points on iOS to accommodate the inline date picker spinner
        // iOS needs ~11 items worth of space (header + date fields + submit button + spinner picker)
        // Android uses a modal date picker, so it needs less space
        const itemCount = Platform.select({ios: 11, default: 7});

        bottomSheet({
            title: label,
            renderContent,
            closeButtonId: 'close-channel-summary',
            snapPoints: [1, bottomSheetSnapPoint(itemCount, 48)],
            theme,
            initialSnapIndex: 1,
        });
    }, [channelId, label, theme]);

    if (showAsLabel) {
        return (
            <SlideUpPanelItem
                onPress={openSheet}
                text={label}
                leftIcon='creation-outline'
                testID={testID}
            />
        );
    }

    return (
        <OptionItem
            action={openSheet}
            label={label}
            icon='creation-outline'
            type='default'
            testID={testID}
        />
    );
};

export default AskAgentsOption;
