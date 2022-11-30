// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import {General} from '@constants';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUserIdFromChannelName} from '@utils/user';

import Icon from './icon';

import type ChannelModel from '@typings/database/models/servers/channel';

type Props = {
    channel: ChannelModel;
    currentUserId: string;
    membersCount: number;
    onPress: (channelId: string) => void;
    hasMember: boolean;
    teamDisplayName?: string;
    theme: Theme;
}

export const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        minHeight: 40,
        alignItems: 'center',
    },
    infoItem: {
        paddingHorizontal: 0,
    },
    wrapper: {
        flex: 1,
        flexDirection: 'row',
    },
    text: {
        marginTop: -1,
        color: changeOpacity(theme.sidebarText, 0.72),
        paddingLeft: 12,
        paddingRight: 20,
    },
    textInfo: {
        color: theme.centerChannelColor,
        paddingRight: 20,
    },
    teamName: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        paddingLeft: 12,
        marginTop: 4,
        ...typography('Body', 75),
    },
}));

export const textStyle = StyleSheet.create({
    bold: typography('Body', 200, 'SemiBold'),
    regular: typography('Body', 200, 'Regular'),
});

const ChannelListItem = ({
    channel, currentUserId, membersCount, hasMember,
    onPress, teamDisplayName, theme,
}: Props) => {
    const {formatMessage} = useIntl();
    const styles = getStyleSheet(theme);

    const height = useMemo(() => {
        return teamDisplayName ? 58 : 44;
    }, [teamDisplayName]);

    const handleOnPress = useCallback(() => {
        onPress(channel.id);
    }, [channel.id]);

    const textStyles = useMemo(() => [
        textStyle.regular,
        styles.text,
        styles.textInfo,
    ], [styles]);

    const containerStyle = useMemo(() => [
        styles.container,
        styles.infoItem,
        {minHeight: height},
    ],
    [height, styles]);

    if (!hasMember) {
        return null;
    }

    const teammateId = (channel.type === General.DM_CHANNEL) ? getUserIdFromChannelName(currentUserId, channel.name) : undefined;
    const isOwnDirectMessage = (channel.type === General.DM_CHANNEL) && currentUserId === teammateId;

    let displayName = channel.displayName;
    if (isOwnDirectMessage) {
        displayName = formatMessage({id: 'channel_header.directchannel.you', defaultMessage: '{displayName} (you)'}, {displayName});
    }

    return (
        <TouchableOpacity onPress={handleOnPress}>
            <>
                <View style={containerStyle}>
                    <View style={styles.wrapper}>
                        <Icon
                            database={channel.database}
                            membersCount={membersCount}
                            name={channel.name}
                            shared={channel.shared}
                            size={24}
                            theme={theme}
                            type={channel.type}
                        />
                        <View>
                            <Text
                                ellipsizeMode='tail'
                                numberOfLines={1}
                                style={textStyles}
                            >
                                {displayName}
                            </Text>
                            {Boolean(teamDisplayName) &&
                            <Text
                                ellipsizeMode='tail'
                                numberOfLines={1}
                                style={styles.teamName}
                            >
                                {teamDisplayName}
                            </Text>
                            }
                        </View>
                    </View>
                </View>
            </>
        </TouchableOpacity>
    );
};

export default ChannelListItem;
