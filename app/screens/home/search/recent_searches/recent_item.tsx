// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import {removeSearchFromTeamSearchHistory} from '@actions/local/team';
import CompassIcon from '@components/compass_icon';
import MenuItem from '@components/menu_item';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type TeamSearchHistoryModel from '@typings/database/models/servers/team_search_history';
export const RECENT_LABEL_HEIGHT = 48;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        recentItemLabelContainer: {
            paddingLeft: 20,
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
            paddingRight: 12,
        },
    };
});

export type RecentItemType = {
        terms: string;
        isOrSearch: boolean;
}

type Props = {
    setRecentValue: (value: string) => void;
    item: TeamSearchHistoryModel;
}

const RecentItem = ({item, setRecentValue}: Props) => {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const testID = 'search.recent_item';
    const serverUrl = useServerUrl();

    const handlePress = useCallback(() => {
        setRecentValue(item.term);
    }, [item, setRecentValue]);

    const handleRemove = useCallback(async () => {
        await removeSearchFromTeamSearchHistory(serverUrl, item.id);
    }, [item]);

    return (
        <MenuItem
            testID={testID}
            onPress={handlePress}
            labelComponent={
                <View style={style.recentItemLabelContainer}>
                    <CompassIcon
                        name='clock-outline'
                        size={24}
                        color={changeOpacity(theme.centerChannelColor, 0.6)}
                    />
                    <Text style={style.recentItemLabel}>{item.term}</Text>
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
