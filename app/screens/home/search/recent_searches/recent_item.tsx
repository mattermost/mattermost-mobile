// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import MenuItem from '@components/menu_item';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export const RECENT_LABEL_HEIGHT = 48;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        recentItemLabelContainer: {
            marginLeft: 20,
            alignItems: 'center',
            flexDirection: 'row',
        },
        recentItemLabel: {
            flex: 1,
            marginLeft: 16,
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
        recentRemove: {
            marginRight: 12,
        },
    };
});

export type RecentItemType = {
        terms: string;
        isOrSearch: boolean;
}

type Props = {
    setSearchValue: (value: string) => void;
    item: RecentItemType;
}

const RecentItem = ({item, removeSearchTerms, setSearchValue}: Props) => {
    const theme = useTheme();

    // TODO add useCallback
    // const removeSearchTerms = preventDoubleTap((item) => {
    //     // const {actions} = this.props;
    //     const newRecent = [...recentValues];
    //     const index = recentValues.indexOf(item);
    //
    //     if (index !== -1) {
    //         recentValues.splice(index, 1);
    //         setRecent({newRecent});
    //     }
    //
    //     actions.removeSearchTerms(currentTeamId, item.terms);
    // });
    //
    const handlePress = useCallback(() => {
        setSearchValue(item.terms);
        console.log('pressed recent value : ', item.terms);

        //        setRecentValue(item);
    }, [item]);

    const handleRemove = useCallback(() => {
        removeSearchTerms(item);
    }, [item]);

    const style = getStyleFromTheme(theme);
    const testID = `search.recent_item.${item.terms}`;

    return (
        <MenuItem

            // testID={item.testID}
            onPress={handlePress}
            labelComponent={
                <View style={style.recentItemLabelContainer}>
                    <CompassIcon
                        name='clock-outline'
                        size={24}
                        color={changeOpacity(theme.centerChannelColor, 0.6)}
                    />
                    <Text style={style.recentItemLabel}>{item.terms}</Text>
                    <TouchableOpacity
                        onPress={handleRemove}
                        style={style.recentRemove}
                        testID={`${testID}.remove.button`}
                    >
                        <CompassIcon
                            name='close'
                            size={24}
                            color={changeOpacity(theme.centerChannelColor, 0.64)}
                        />
                    </TouchableOpacity>
                </View>
            }
            separator={false}
            theme={theme}
        />
    );
};

export default RecentItem;
