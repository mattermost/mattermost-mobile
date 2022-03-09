// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, Text, View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';

import {switchToChannelById} from '@actions/remote/channel';
import ChannelIcon from '@components/channel_icon';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingLeft: 2,
        paddingVertical: 4,
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
        flex: 1,
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
    channel: Pick<ChannelModel, 'deleteAt' | 'displayName' | 'name' | 'shared' | 'type'>;
    isActive: boolean;
    isOwnDirectMessage: boolean;
    myChannel: MyChannelModel;
}

const ChannelListItem = ({channel, isActive, isOwnDirectMessage, myChannel}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    // Make it brighter if it's highlighted, or has unreads
    const bright = myChannel.isUnread || myChannel.mentionsCount > 0;

    const switchChannels = () => switchToChannelById(serverUrl, myChannel.id);
    const membersCount = useMemo(() => {
        if (channel.type === General.GM_CHANNEL) {
            return channel.displayName?.split(',').length;
        }

        return 0;
    }, [channel.type, channel.displayName]);

    const textStyles = useMemo(() => [
        bright ? textStyle.bright : textStyle.regular,
        styles.text,
        bright && styles.highlight,
    ], [bright, styles]);

    let displayName = channel.displayName;
    if (isOwnDirectMessage) {
        displayName = formatMessage({id: 'channel_header.directchannel.you', defaultMessage: '{displayName} (you)'}, {displayName});
    }

    if (channel.deleteAt > 0 && !isActive) {
        return null;
    }

    return (
        <TouchableOpacity onPress={switchChannels}>
            <View style={styles.container}>
                <ChannelIcon
                    isActive={isActive}
                    isArchived={channel.deleteAt > 0}
                    membersCount={membersCount}
                    name={channel.name}
                    shared={channel.shared}
                    size={24}
                    type={channel.type}
                />
                <Text
                    ellipsizeMode='tail'
                    numberOfLines={1}
                    style={textStyles}
                >
                    {displayName}
                </Text>

            </View>
        </TouchableOpacity>
    );
};

export default ChannelListItem;
