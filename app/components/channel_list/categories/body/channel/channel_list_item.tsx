// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';

import {switchToChannelById} from '@actions/remote/channel';
import ChannelIcon from '@app/components/channel_icon';
import {useServerUrl} from '@app/context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingVertical: 4,
        flexDirection: 'row',
    },
    icon: {
        fontSize: 24,
        lineHeight: 28,
        color: changeOpacity(theme.sidebarText, 0.72),
    },
    text: {
        marginTop: -1,
        color: changeOpacity(theme.sidebarText, 0.72),
        paddingLeft: 12,
    },
    highlight: {
        color: theme.sidebarText,
    },
}));

const textStyle = StyleSheet.create({
    bright: typography('Body', 200, 'SemiBold'),
    regular: typography('Body', 200, 'Regular'),
});

type Props = {
    channel: Pick<ChannelModel, 'displayName' | 'type'>;
    myChannel: MyChannelModel;
}

const ChannelListItem = ({channel, myChannel}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    // Make it brighter if it's highlighted, or has unreads
    const bright = false;

    return (
        <TouchableOpacity onPress={() => switchToChannelById(serverUrl, myChannel.id)}>
            <View style={styles.container}>
                <ChannelIcon
                    shared={false}
                    type={channel.type}
                    size={24}
                />
                <Text
                    style={[
                        bright ? textStyle.bright : textStyle.regular,
                        styles.text,
                        bright && styles.highlight,
                    ]}
                >
                    {channel.displayName}
                </Text>

            </View>
        </TouchableOpacity>
    );
};

export default ChannelListItem;
