// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {toggleMuteChannel} from '@actions/remote/channel';
import OptionBox from '@components/option_box';
import {useServerUrl} from '@context/server';
import {dismissBottomSheet} from '@screens/navigation';

import type {StyleProp, ViewStyle} from 'react-native';

type Props = {
    channelId: string;
    containerStyle?: StyleProp<ViewStyle>;
    isMuted: boolean;
    showSnackBar?: boolean;
    testID?: string;
}

const MutedBox = ({channelId, containerStyle, isMuted, showSnackBar = false, testID}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const handleOnPress = useCallback(async () => {
        await dismissBottomSheet();
        toggleMuteChannel(serverUrl, channelId, showSnackBar);
    }, [channelId, isMuted, serverUrl, showSnackBar]);

    const muteActionTestId = isMuted ? `${testID}.unmute.action` : `${testID}.mute.action`;

    return (
        <OptionBox
            activeIconName='bell-off-outline'
            activeText={intl.formatMessage({id: 'channel_info.muted', defaultMessage: 'Muted'})}
            containerStyle={containerStyle}
            iconName='bell-outline'
            isActive={isMuted}
            onPress={handleOnPress}
            testID={muteActionTestId}
            text={intl.formatMessage({id: 'channel_info.muted', defaultMessage: 'Mute'})}
        />
    );
};

export default MutedBox;
