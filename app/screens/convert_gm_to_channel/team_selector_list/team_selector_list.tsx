// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View} from 'react-native';

import TeamList from '@app/components/team_list';
import {useTheme} from '@app/context/theme';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@app/utils/theme';
import SearchBar from '@components/search';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        padding: 12,
    },
    listContainer: {
        marginTop: 12,
    },
}));

type Props = {
    teams: Team[];
    selectTeam: (teamId: string) => void;
}

const TeamSelectorList = ({teams, selectTeam}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const color = useMemo(() => changeOpacity(theme.centerChannelColor, 0.72), [theme]);

    return (
        <View style={styles.container}>
            <SearchBar
                autoCapitalize='none'
                autoFocus={true}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                placeholderTextColor={color}
                searchIconColor={color}
                testID='convert_gm_to_channel_team_search_bar'
                onChangeText={selectTeam}
            />
            <View style={styles.listContainer}>
                <TeamList
                    teams={teams}
                    onPress={() => ''}
                />
            </View>
        </View>
    );
};

export default TeamSelectorList;
