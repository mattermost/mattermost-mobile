// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {StyleProp, ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import OptionBox from '@components/option_box';
import SlideUpPanelItem from '@components/slide_up_panel_item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {dismissBottomSheet, showModal} from '@screens/navigation';

type Props = {
    channelId: string;
    containerStyle?: StyleProp<ViewStyle>;
    showAsLabel?: boolean;
    testID?: string;
}

const InfoBox = ({channelId, containerStyle, showAsLabel = false, testID}: Props) => {
    const intl = useIntl();
    const theme = useTheme();

    const onViewInfo = useCallback(async () => {
        await dismissBottomSheet();
        const title = intl.formatMessage({id: 'screens.channel_info', defaultMessage: 'Channel Info'});
        const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        const closeButtonId = 'close-channel-info';

        const options = {
            topBar: {
                leftButtons: [{
                    id: closeButtonId,
                    icon: closeButton,
                    testID: closeButtonId,
                }],
            },
            modal: {swipeToDismiss: false},
        };
        showModal(Screens.CHANNEL_INFO, title, {channelId, closeButtonId}, options);
    }, [intl, channelId, theme]);

    if (showAsLabel) {
        return (
            <SlideUpPanelItem
                icon='information-outline'
                onPress={onViewInfo}
                testID={testID}
                text={intl.formatMessage({id: 'channel_header.info', defaultMessage: 'View info'})}
            />
        );
    }

    return (
        <OptionBox
            containerStyle={containerStyle}
            iconName='information-outline'
            onPress={onViewInfo}
            testID={testID}
            text={intl.formatMessage({id: 'intro.channel_info', defaultMessage: 'Info'})}
        />
    );
};

export default InfoBox;
