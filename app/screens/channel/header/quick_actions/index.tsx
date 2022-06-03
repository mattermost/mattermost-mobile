// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import ChannelActions from '@components/channel_actions';
import InfoBox from '@components/channel_actions/info_box';
import LeaveChannelLabel from '@components/channel_actions/leave_channel_label';
import {QUICK_OPTIONS_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    channelId: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        minHeight: QUICK_OPTIONS_HEIGHT,
    },
    line: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        height: 1,
        marginVertical: 8,
    },
    wrapper: {
        marginBottom: 8,
    },
    separator: {
        width: 8,
    },
}));

const ChannelQuickAction = ({channelId}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <View style={styles.wrapper}>
                <ChannelActions channelId={channelId}/>
            </View>
            <InfoBox
                channelId={channelId}
                showAsLabel={true}
            />
            <View style={styles.line}/>
            <LeaveChannelLabel channelId={channelId}/>
        </View>
    );
};

export default ChannelQuickAction;
