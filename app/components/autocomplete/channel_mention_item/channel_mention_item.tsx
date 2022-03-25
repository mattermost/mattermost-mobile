// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import ChannelIcon from '@components/channel_icon';
import {BotTag, GuestTag} from '@components/tag';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {General} from '@constants';
import {useTheme} from '@context/theme';
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
        if (channel.type === General.DM_CHANNEL || channel.type === General.GM_CHANNEL) {
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

    if (channel.type === General.DM_CHANNEL || channel.type === General.GM_CHANNEL) {
        if (!displayName) {
            return null;
        }

        component = (
            <TouchableWithFeedback
                key={channel.id}
                onPress={completeMention}
                style={rowStyle}
                testID={testID}
                type={'opacity'}
            >
                <Text style={style.rowDisplayName}>{'@' + displayName}</Text>
                <BotTag
                    show={isBot}
                />
                <GuestTag
                    show={isGuest}
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
                testID={testID}
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
                    <Text style={style.rowDisplayName}>{displayName}</Text>
                    <Text style={style.rowName}>{` ~${channel.name}`}</Text>
                </View>
            </TouchableWithFeedback>
        );
    }

    return component;
};

export default ChannelMentionItem;
