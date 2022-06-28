// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {TouchableOpacity, View, Text} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const ITEM_HEIGHT = 45;

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        itemContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            paddingHorizontal: 15,
            height: ITEM_HEIGHT,
        },
        item: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
        },
        itemText: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'Regular'),
        },
    };
});
type TimezoneRowProps = {
    onPressTimezone: (timezone: string) => void;
    selectedTimezone: string;
    timezone: string;
}
const TimezoneRow = ({onPressTimezone, selectedTimezone, timezone}: TimezoneRowProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const onTimezoneSelect = () => {
        onPressTimezone(timezone);
    };

    return (
        <TouchableOpacity
            style={styles.itemContainer}
            key={timezone}
            onPress={onTimezoneSelect}
        >
            <View style={styles.item}>
                <Text style={styles.itemText}>
                    {timezone}
                </Text>
            </View>
            {timezone === selectedTimezone && (
                <CompassIcon
                    name='check'
                    size={24}
                    color={theme.linkColor}
                />
            )}
        </TouchableOpacity>
    );
};

export default TimezoneRow;
