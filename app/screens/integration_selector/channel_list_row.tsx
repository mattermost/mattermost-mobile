// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {
    GestureResponderEvent,
    Text,
    View,
} from 'react-native';

import CompassIcon from '@components/compass_icon';
import CustomListRow, { Props as CustomListRowProps } from './custom_list_row';
import { makeStyleSheetFromTheme, changeOpacity } from '@utils/theme';

type ChannelListRowProps = {
    id: string,
    isArchived: boolean,
    theme: object,
    channel: Channel,
};

type Props = ChannelListRowProps & CustomListRowProps;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        titleContainer: {
            alignItems: 'center',
            flexDirection: 'row',
        },
        displayName: {
            fontSize: 16,
            color: theme.centerChannelColor,
            marginLeft: 5,
        },
        icon: {
            fontSize: 16,
            color: theme.centerChannelColor,
        },
        container: {
            flex: 1,
            flexDirection: 'column',
        },
        outerContainer: {
            flex: 1,
            flexDirection: 'row',
            paddingHorizontal: 15,
            overflow: 'hidden',
        },
        purpose: {
            marginTop: 7,
            fontSize: 13,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});

const ChannelListRow = ({
    onPress, id, theme, channel, testID, isArchived,
    enabled, selectable, selected,
}: Props) => {
    const onPressRow = (event: GestureResponderEvent): void => {
        if (!onPress) {
            return;
        }

        onPress(id, channel);
    };

    const style = getStyleFromTheme(theme);

    let purpose = null;
    if (channel.purpose) {
        purpose = (
            <Text
                style={style.purpose}
                ellipsizeMode='tail'
                numberOfLines={1}
            >
                {channel.purpose}
            </Text>
        );
    }

    const itemTestID = `${testID}.${id}`;
    const channelDisplayNameTestID = `${testID}.display_name`;
    let icon = 'globe';
    if (isArchived) {
        icon = 'archive-outline';
    } else if (channel?.shared) {
        icon = 'circle-multiple-outline';
    }

    return (
        <View style={style.outerContainer}>
            <CustomListRow
                id={id}
                onPress={onPressRow}
                enabled={enabled}
                selectable={selectable}
                selected={selected}
                testID={testID}
            >
                <View
                    style={style.container}
                    testID={itemTestID}
                >
                    <View style={style.titleContainer}>
                        <CompassIcon
                            name={icon}
                            style={style.icon}
                        />
                        <Text
                            style={style.displayName}
                            testID={channelDisplayNameTestID}
                        >
                            {channel.display_name}
                        </Text>
                    </View>
                    {purpose}
                </View>
            </CustomListRow>
        </View>
    );
};

export default ChannelListRow;
