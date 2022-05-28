// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {StyleSheet, View} from 'react-native';

import AddPeopleBox from '@components/channel_actions/add_people_box';
import CopyChannelLinkBox from '@components/channel_actions/copy_channel_link_box';
import FavoriteBox from '@components/channel_actions/favorite_box';
import InfoBox from '@components/channel_actions/info_box';
import LeaveChannelLabel from '@components/channel_actions/leave_channel_label';
import MutedBox from '@components/channel_actions/mute_box';
import SetHeaderBox from '@components/channel_actions/set_header_box';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {dismissBottomSheet} from '@screens/navigation';
import {changeOpacity} from '@utils/theme';

type Props = {
    channelId: string;
    channelType?: string;
}

const OPTIONS_HEIGHT = 62;
const DIRECT_CHANNELS: string[] = [General.DM_CHANNEL, General.GM_CHANNEL];

const styles = StyleSheet.create({
    container: {
        minHeight: 270,
    },
    wrapper: {
        flexDirection: 'row',
        height: OPTIONS_HEIGHT,
        marginBottom: 8,
    },
    separator: {
        width: 8,
    },
});

const ChannelQuickAction = ({channelId, channelType}: Props) => {
    const theme = useTheme();

    const onCopyLinkAnimationEnd = useCallback(() => {
        requestAnimationFrame(async () => {
            await dismissBottomSheet();
        });
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.wrapper}>
                <FavoriteBox
                    channelId={channelId}
                    showSnackBar={true}
                />
                <View style={styles.separator}/>
                <MutedBox
                    channelId={channelId}
                    showSnackBar={true}
                />
                <View style={styles.separator}/>
                {channelType && DIRECT_CHANNELS.includes(channelType) &&
                <SetHeaderBox channelId={channelId}/>
                }
                {channelType && !DIRECT_CHANNELS.includes(channelType) &&
                <>
                    <AddPeopleBox channelId={channelId}/>
                    <View style={styles.separator}/>
                    <CopyChannelLinkBox
                        channelId={channelId}
                        onAnimationEnd={onCopyLinkAnimationEnd}
                    />
                </>
                }
            </View>
            <InfoBox
                channelId={channelId}
                showAsLabel={true}
            />
            <View style={{backgroundColor: changeOpacity(theme.centerChannelColor, 0.08), height: 1, marginVertical: 8}}/>
            <LeaveChannelLabel channelId={channelId}/>
        </View>
    );
};

export default ChannelQuickAction;
