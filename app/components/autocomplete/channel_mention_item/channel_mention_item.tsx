// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import ChannelIcon from '@components/channel_icon';
import {BotTag, GuestTag} from '@components/tag';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {isDMorGM} from '@utils/channel';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

import type ChannelModel from '@typings/database/models/servers/channel';

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        icon: {
            marginRight: 11,
            opacity: 0.56,
        },
        row: {
            paddingHorizontal: 16,
            height: 40,
            flexDirection: 'row',
            alignItems: 'center',
        },
        rowDisplayName: {
            flex: 1,
            fontSize: 15,
            color: theme.centerChannelColor,
        },
        rowName: {
            fontSize: 15,
            color: theme.centerChannelColor,
            opacity: 0.56,
        },
    };
});

type Props = {
    channel: Channel | ChannelModel;
    displayName?: string;
    isBot: boolean;
    isGuest: boolean;
    onPress: (name?: string) => void;
    testID?: string;
};

const ChannelMentionItem = ({
    channel,
    displayName,
    isBot,
    isGuest,
    onPress,
    testID,
}: Props) => {
    const insets = useSafeAreaInsets();
    const theme = useTheme();

    const completeMention = () => {
        if (isDMorGM(channel)) {
            onPress('@' + displayName?.replace(/ /g, ''));
        } else {
            onPress(channel.name);
        }
    };

    const style = getStyleFromTheme(theme);
    const margins = useMemo(() => {
        return {marginLeft: insets.left, marginRight: insets.right};
    }, [insets]);
    const rowStyle = useMemo(() => {
        return [style.row, margins];
    }, [margins, style]);

    let component;

    const isArchived = ('delete_at' in channel ? channel.delete_at : channel.deleteAt) > 0;
    const channelMentionItemTestId = `${testID}.${channel.name}`;

    if (isDMorGM(channel)) {
        if (!displayName) {
            return null;
        }

        component = (
            <TouchableWithFeedback
                key={channel.id}
                onPress={completeMention}
                style={rowStyle}
                testID={channelMentionItemTestId}
                type={'opacity'}
            >
                <Text
                    style={style.rowDisplayName}
                    testID={`${channelMentionItemTestId}.display_name`}
                >
                    {'@' + displayName}
                </Text>
                <BotTag
                    show={isBot}
                    testID={`${channelMentionItemTestId}.bot.tag`}
                />
                <GuestTag
                    show={isGuest}
                    testID={`${channelMentionItemTestId}.guest.tag`}
                />
            </TouchableWithFeedback>
        );
    } else {
        component = (
            <TouchableWithFeedback
                key={channel.id}
                onPress={completeMention}
                style={margins}
                underlayColor={changeOpacity(theme.buttonBg, 0.08)}
                testID={channelMentionItemTestId}
                type={'native'}
            >
                <View style={style.row}>
                    <ChannelIcon
                        name={channel.name}
                        shared={channel.shared}
                        type={channel.type}
                        isInfo={true}
                        isArchived={isArchived}
                        size={18}
                        style={style.icon}
                    />
                    <Text
                        numberOfLines={1}
                        style={style.rowDisplayName}
                        testID={`${channelMentionItemTestId}.display_name`}
                    >
                        {displayName}
                        <Text
                            style={style.rowName}
                            testID={`${channelMentionItemTestId}.name`}
                        >
                            {` ~${channel.name}`}
                        </Text>
                    </Text>
                </View>
            </TouchableWithFeedback>
        );
    }

    return component;
};

export default ChannelMentionItem;
