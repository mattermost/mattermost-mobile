// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React, {useCallback} from 'react';
import {Text, TouchableHighlight, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export const RECENT_LABEL_HEIGHT = 42;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        recentItemContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            height: RECENT_LABEL_HEIGHT,
            marginLeft: 16,
        },
        recentItemLabel: {
            marginLeft: 16,
            color: theme.centerChannelColor,
            ...typography('Body', 400, 'Regular'),
        },
        recentRemove: {
            alignItems: 'center',
            height: RECENT_LABEL_HEIGHT,
            justifyContent: 'center',
            width: 50,
        },
    };
});

export type RecentItemType = {
        terms: string;
        isOrSearch: boolean;
}

type Props = {
        item: RecentItemType;
        removeSearchTerms: PropTypes.func.isRequired;
        setRecentValue: PropTypes.func.isRequired;
}

const RecentItem = ({item, removeSearchTerms, setRecentValue}: Props) => {
    const theme = useTheme();

    const handlePress = useCallback(() => {
        setRecentValue(item);
    }, [item]);

    const handleRemove = useCallback(() => {
        removeSearchTerms(item);
    }, [item]);

    const style = getStyleFromTheme(theme);
    const testID = `search.recent_item.${item.terms}`;

    return (
        <TouchableHighlight
            key={item.terms}
            underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
            onPress={handlePress}
        >
            <View
                testID={testID}
                style={style.recentItemContainer}
            >
                <CompassIcon
                    name='clock-outline'
                    size={24}
                    color={changeOpacity(theme.centerChannelColor, 0.6)}
                />
                <Text
                    style={style.recentItemLabel}
                >
                    {item.terms}
                </Text>
                <TouchableOpacity
                    onPress={handleRemove}
                    style={style.recentRemove}
                    testID={`${testID}.remove.button`}
                >
                    <CompassIcon
                        name='close-circle-outline'
                        size={24}
                        color={changeOpacity(theme.centerChannelColor, 0.6)}
                    />
                </TouchableOpacity>
            </View>
        </TouchableHighlight>
    );
};

export default RecentItem;
