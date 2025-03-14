// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {debounce} from 'lodash';
import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import SearchBar from '@components/search';
import TeamList from '@components/team_list';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import SecurityManager from '@managers/security_manager';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity, getKeyboardAppearanceFromTheme} from '@utils/theme';

import type {AvailableScreens} from '@typings/screens/navigation';

const styles = StyleSheet.create({
    container: {
        padding: 12,
    },
    listContainer: {
        marginTop: 12,
    },
});

type Props = {
    componentId: AvailableScreens;
    teams: Team[];
    selectTeam: (teamId: string) => void;
}

const TeamSelectorList = ({componentId, teams, selectTeam}: Props) => {
    const theme = useTheme();
    const [filteredTeams, setFilteredTeam] = useState(teams);
    const color = useMemo(() => changeOpacity(theme.centerChannelColor, 0.72), [theme]);

    const handleOnChangeSearchText = useCallback(debounce((searchTerm: string) => {
        if (searchTerm === '') {
            setFilteredTeam(teams);
        } else {
            setFilteredTeam(teams.filter((team) => team.display_name.includes(searchTerm) || team.name.includes(searchTerm)));
        }
    }, 200), [teams]);

    const handleOnPress = usePreventDoubleTap(useCallback((teamId: string) => {
        selectTeam(teamId);
        popTopScreen();
    }, []));

    return (
        <View
            nativeID={SecurityManager.getShieldScreenId(componentId)}
            style={styles.container}
        >
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
