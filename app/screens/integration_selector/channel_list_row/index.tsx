// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {
    Text,
    View,
} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import CustomListRow, {type Props as CustomListRowProps} from '../custom_list_row';

type ChannelListRowProps = {
    id: string;
    theme: Theme;
    channel: Channel;
    onPress: (item: Channel) => void;
};

type Props = ChannelListRowProps & CustomListRowProps;

const getIconForChannel = (selectedChannel: Channel): string => {
    let icon = 'globe';

    if (selectedChannel.type === 'P') {
        icon = 'padlock';
    }

    if (selectedChannel.delete_at) {
        icon = 'archive-outline';
    } else if (selectedChannel.shared) {
        icon = 'circle-multiple-outline';
    }

    return icon;
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        titleContainer: {
            alignItems: 'center',
            flexDirection: 'row',
        },
        displayName: {
            ...typography('Body', 200, 'Regular'),
            color: theme.centerChannelColor,
            marginLeft: 5,
        },
        icon: {
            ...typography('Body', 200, 'Regular'),
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
            color: changeOpacity(theme.centerChannelColor, 0.5),
            ...typography('Body', 100, 'Regular'),
        },
    };
});

const ChannelListRow = ({
    onPress, id, theme, channel, testID, enabled, selectable, selected,
}: Props) => {
    const style = getStyleFromTheme(theme);

    const onPressRow = useCallback((): void => {
        onPress(channel);
    }, [onPress, channel]);

    const renderPurpose = (channelPurpose: string): JSX.Element | null => {
        if (!channelPurpose) {
            return null;
        }

        return (
            <Text
                style={style.purpose}
                ellipsizeMode='tail'
                numberOfLines={1}
            >
                {channel.purpose}
            </Text>
        );
    };

    const itemTestID = `${testID}.${id}`;
    const channelDisplayNameTestID = `${testID}.display_name`;
    const channelIcon = getIconForChannel(channel);

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
                            name={channelIcon}
                            style={style.icon}
                        />
                        <Text
                            style={style.displayName}
                            testID={channelDisplayNameTestID}
                        >
                            {channel.display_name}
                        </Text>
                    </View>

                    {renderPurpose(channel.purpose)}
                </View>
            </CustomListRow>
        </View>
    );
};

export default ChannelListRow;
