// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, type ComponentProps} from 'react';
import {View} from 'react-native';

import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import Tabs from '@hooks/use_tabs/tabs';
import TeamPicker from '@screens/home/search/team_picker';
import SearchStore from '@store/search_store';
import {type FileFilter, FileFilters} from '@utils/file';
import {navigateToScreen} from '@utils/navigation/adapter';
import {TabTypes, type TabType} from '@utils/search';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    onFilterChanged: (filter: FileFilter) => void;
    selectedTab: TabType;
    selectedFilter: FileFilter;
    setTeamId: (id: string) => void;
    teamId: string;
    teams: TeamModel[];
    crossTeamSearchEnabled: boolean;
    tabsProps: ComponentProps<typeof Tabs>;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            marginTop: 10,
            borderBottomWidth: 1,
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            backgroundColor: theme.centerChannelBg,
        },
        badge: {
            backgroundColor: theme.buttonBg,
            borderColor: theme.centerChannelBg,
            marginTop: 2,
        },
        header: {
            marginBottom: 12,
            paddingHorizontal: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        buttonContainer: {
            flexDirection: 'row',
        },
        teamPickerContainer: {
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'flex-end',
        },
        filterContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: 32,
        },
    };
});

const Header = ({
    teamId,
    setTeamId,
    onFilterChanged,
    selectedTab,
    selectedFilter,
    teams,
    crossTeamSearchEnabled,
    tabsProps,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    const showFilterIcon = selectedTab === TabTypes.FILES;
    const hasFilters = selectedFilter !== FileFilters.ALL;

    const handleFilterPress = useCallback(() => {
        // Store data and callback in SearchStore
        SearchStore.setFileFilterData({
            initialFilter: selectedFilter,
            callback: onFilterChanged,
        });

        // Navigate to bottom sheet route
        navigateToScreen(Screens.SEARCH_FILE_FILTER);
    }, [selectedFilter, onFilterChanged]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Tabs {...tabsProps}/>
                {showFilterIcon && (
                    <View style={styles.filterContainer}>
                        <View>
                            <CompassIcon
                                name={'filter-variant'}
                                testID='search.filters.file_type_icon'
                                size={24}
                                color={changeOpacity(
                                    theme.centerChannelColor,
                                    0.56,
                                )}
                                onPress={handleFilterPress}
                            />
                            <Badge
                                style={styles.badge}
                                visible={hasFilters}
                                testID={'search.filters.badge'}
                                value={-1}
                            />
                        </View>
                    </View>
                )}
                {teams.length > 1 && (
                    <View style={styles.teamPickerContainer}>
                        <TeamPicker
                            setTeamId={setTeamId}
                            teamId={teamId}
                            teams={teams}
                            crossTeamSearchEnabled={crossTeamSearchEnabled}
                        />
                    </View>
                )}

            </View>
        </View>
    );
};

export default React.memo(Header);
