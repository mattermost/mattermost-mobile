// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {preventDoubleTap} from '@app/utils/tap';
import SearchBar from '@components/search';
import TeamList from '@components/team_list';
import {useTheme} from '@context/theme';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity, getKeyboardAppearanceFromTheme} from '@utils/theme';

const styles = StyleSheet.create({
    container: {
        padding: 12,
    },
    listContainer: {
        marginTop: 12,
    },
});

type Props = {
    teams: Team[];
    selectTeam: (teamId: string) => void;
}

const TeamSelectorList = ({teams, selectTeam}: Props) => {
    const theme = useTheme();

    const color = useMemo(() => changeOpacity(theme.centerChannelColor, 0.72), [theme]);

    const [filteredTeams, setFilteredTeam] = useState(teams);

    const handleOnChangeSearchText = useCallback((searchTerm: string) => {
        if (searchTerm === '') {
            setFilteredTeam(teams);
        } else {
            setFilteredTeam(teams.filter((team) => team.display_name.includes(searchTerm) || team.name.includes(searchTerm)));
        }
    }, [teams]);

    const handleOnPress = useCallback(preventDoubleTap((teamId: string) => {
        selectTeam(teamId);
        popTopScreen();
    }), []);

    return (
        <View style={styles.container}>
            <SearchBar
                autoCapitalize='none'
                autoFocus={true}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                placeholderTextColor={color}
                searchIconColor={color}
                testID='convert_gm_to_channel_team_search_bar'
                onChangeText={handleOnChangeSearchText}
            />
            <View style={styles.listContainer}>
                <TeamList
                    teams={filteredTeams}
                    onPress={handleOnPress}
                />
            </View>
        </View>
    );
};

export default TeamSelectorList;
