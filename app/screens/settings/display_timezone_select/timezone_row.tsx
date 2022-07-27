// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {TouchableOpacity, View, Text} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import SettingSeparator from '@screens/settings/settings_separator';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const ITEM_HEIGHT = 48;

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        itemContainer: {
            flexDirection: 'column',
            alignItems: 'center',
            paddingHorizontal: 18,
            height: ITEM_HEIGHT,
        },
        item: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
        },
        itemText: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
        body: {
            flexDirection: 'row',
        },
        lineStyles: {
            width: '100%',
        },
    };
});
type TimezoneRowProps = {
    isSelected: boolean;
    onPressTimezone: (timezone: string) => void;
    timezone: string;
}
const TimezoneRow = ({onPressTimezone, isSelected, timezone}: TimezoneRowProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const onTimezoneSelect = useCallback(() => {
        onPressTimezone(timezone);
    }, [onPressTimezone, timezone]);

    return (
        <TouchableOpacity
            key={timezone}
            onPress={onTimezoneSelect}
            style={styles.itemContainer}
        >
            <View
                style={styles.body}
            >
                <View style={styles.item}>
                    <Text style={styles.itemText}>
                        {timezone}
                    </Text>
                </View>
                {isSelected && (
                    <CompassIcon
                        color={theme.linkColor}
                        name='check'
                        size={24}
                    />
                )}
            </View>
            <SettingSeparator
                lineStyles={styles.lineStyles}
            />
        </TouchableOpacity>
    );
};

export default TimezoneRow;
