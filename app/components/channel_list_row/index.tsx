// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    channel: Channel;
    onPress: (channel: Channel) => void;
    testID?: string;
    selectable?: boolean;
    selected?: boolean;
}

const ARCHIVED = 'archive-outline';
const CHECKED = 'check-circle';
const GLOBE = 'globe';
const LOCK = 'lock-outline';
const SHARED = 'circle-multiple-outline';
const UNCHECK = 'circle-outline';

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        titleContainer: {
            flex: 1,
            marginLeft: 16,
            flexDirection: 'column',
        },
        displayName: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
        },
        icon: {
            padding: 2,
            color: changeOpacity(theme.centerChannelColor, 0.56),
        },
        container: {
            flex: 1,
            flexDirection: 'row',
        },
        outerContainer: {
            paddingVertical: 9,
        },
        purpose: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
    };
});

export default function ChannelListRow({
    channel,
    onPress,
    testID,
    selectable,
    selected,
}: Props) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const handlePress = () => {
        onPress(channel);
    };

    const selectionIcon = useMemo(() => {
        if (!selectable) {
            return null;
        }

        return (
            <View>
                <CompassIcon
                    name={selected ? CHECKED : UNCHECK}
                    size={28}
                    color={selected ? theme.buttonBg : changeOpacity(theme.centerChannelColor, 0.32)}
                />
            </View>
        );
    }, [selectable, selected, theme]);

    let purposeComponent;
    if (channel.purpose) {
        purposeComponent = (
            <Text
                style={style.purpose}
                ellipsizeMode='tail'
                numberOfLines={1}
            >
                {channel.purpose}
            </Text>
        );
    }

    const itemTestID = `${testID}.${channel.name}`;
    const channelDisplayNameTestID = `${itemTestID}.display_name`;
    let icon = channel.type === General.PRIVATE_CHANNEL ? LOCK : GLOBE;

    if (channel.delete_at) {
        icon = ARCHIVED;
    } else if (channel.shared) {
        icon = SHARED;
    }

    return (
        <View style={style.outerContainer}>
            <TouchableOpacity
                onPress={handlePress}
            >
                <View
                    style={style.container}
                    testID={itemTestID}
                >
                    <CompassIcon
                        name={icon}
                        size={20}
                        style={style.icon}
                    />
                    <View style={style.titleContainer}>
                        <Text
                            style={style.displayName}
                            testID={channelDisplayNameTestID}
                        >
                            {channel.display_name}
                        </Text>
                        {purposeComponent}
                    </View>
                    {selectionIcon}
                </View>
            </TouchableOpacity>
        </View>
    );
}
