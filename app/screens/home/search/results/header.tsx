// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useMemo, type ComponentProps} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import Filter, {DIVIDERS_HEIGHT, FILTER_ITEM_HEIGHT, NUMBER_FILTER_ITEMS} from '@components/files/file_filter';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import Tabs from '@hooks/use_tabs/tabs';
import {TITLE_SEPARATOR_MARGIN, TITLE_SEPARATOR_MARGIN_TABLET, TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import TeamPicker from '@screens/home/search/team_picker';
import {bottomSheet} from '@screens/navigation';
import {type FileFilter, FileFilters} from '@utils/file';
import {bottomSheetSnapPoint} from '@utils/helpers';
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
    const intl = useIntl();
    const isTablet = useIsTablet();

    const title = intl.formatMessage({id: 'screen.search.results.filter.title', defaultMessage: 'Filter by file type'});

    const showFilterIcon = selectedTab === TabTypes.FILES;
    const hasFilters = selectedFilter !== FileFilters.ALL;

    const snapPoints = useMemo(() => {
        return [
            1,
            bottomSheetSnapPoint(
                NUMBER_FILTER_ITEMS,
                FILTER_ITEM_HEIGHT,
            ) + TITLE_HEIGHT + DIVIDERS_HEIGHT + (isTablet ? TITLE_SEPARATOR_MARGIN_TABLET : TITLE_SEPARATOR_MARGIN),
        ];
    }, [isTablet]);

    const handleFilterPress = useCallback(() => {
        const renderContent = () => {
            return (
                <Filter
                    initialFilter={selectedFilter}
                    setFilter={onFilterChanged}
                    title={title}
                />
            );
        };
        bottomSheet({
            closeButtonId: 'close-search-filters',
            renderContent,
            snapPoints,
            theme,
            title,
        });
    }, [onFilterChanged, selectedFilter, snapPoints, title, theme]);

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

export default Header;
