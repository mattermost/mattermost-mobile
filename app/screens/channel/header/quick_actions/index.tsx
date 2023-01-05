// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import ChannelActions from '@components/channel_actions';
import CopyChannelLinkOption from '@components/channel_actions/copy_channel_link_option';
import InfoBox from '@components/channel_actions/info_box';
import LeaveChannelLabel from '@components/channel_actions/leave_channel_label';
import {useTheme} from '@context/theme';
import {dismissBottomSheet} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    channelId: string;
    callsEnabled: boolean;
    isDMorGM: boolean;
}

export const SEPARATOR_HEIGHT = 17;
export const MARGIN = 8;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
    },
    line: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        height: 1,
        marginVertical: MARGIN,
    },
    wrapper: {
        marginBottom: MARGIN,
    },
    separator: {
        width: MARGIN,
    },
}));

const ChannelQuickAction = ({channelId, callsEnabled, isDMorGM}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <View style={styles.wrapper}>
                <ChannelActions
                    channelId={channelId}
                    dismissChannelInfo={dismissBottomSheet}
                    callsEnabled={callsEnabled}
                    testID='channel.quick_actions'
                />
            </View>
            <InfoBox
                channelId={channelId}
                showAsLabel={true}
                testID='channel.quick_actions.channel_info.action'
            />
            {callsEnabled && !isDMorGM && // if calls is not enabled, copy link will show in the channel actions
                <CopyChannelLinkOption
                    channelId={channelId}
                    showAsLabel={true}
                />
            }
            <View style={styles.line}/>
            <LeaveChannelLabel
                channelId={channelId}
                testID='channel.quick_actions.leave_channel.action'
            />
        </View>
    );
};

export default ChannelQuickAction;
