// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import {BotTag, GuestTag} from '@components/tag';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        icon: {
            fontSize: 18,
            marginRight: 11,
            color: theme.centerChannelColor,
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
    channel: Channel;
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
    const margins = {marginLeft: insets.left, marginRight: insets.right};
    let iconName = 'globe';
    let component;
    if (channel.shared) {
        iconName = channel.type === General.PRIVATE_CHANNEL ? 'circle-multiple-outline-lock' : 'circle-multiple-outline';
    } else if (channel.type === General.PRIVATE_CHANNEL) {
        iconName = 'lock';
    }

    if (channel.type === General.DM_CHANNEL || channel.type === General.GM_CHANNEL) {
        if (!displayName) {
            return null;
        }

        component = (
            <TouchableWithFeedback
                key={channel.id}
                onPress={completeMention}
                style={[style.row, margins]}
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
                    <CompassIcon
                        name={iconName}
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
