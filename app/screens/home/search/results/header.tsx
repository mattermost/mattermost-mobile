// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import Filter, {DIVIDERS_HEIGHT, FILTER_ITEM_HEIGHT, NUMBER_FILTER_ITEMS} from '@components/files/file_filter';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {TITLE_SEPARATOR_MARGIN, TITLE_SEPARATOR_MARGIN_TABLET, TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import TeamPickerIcon from '@screens/home/search/team_picker_icon';
import {bottomSheet} from '@screens/navigation';
import {type FileFilter, FileFilters} from '@utils/file';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {TabTypes, type TabType} from '@utils/search';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import SelectButton from './header_button';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    onTabSelect: (tab: TabType) => void;
    onFilterChanged: (filter: FileFilter) => void;
    selectedTab: TabType;
    selectedFilter: FileFilter;
    setTeamId: (id: string) => void;
    teamId: string;
    teams: TeamModel[];
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            marginTop: 10,
            backgroundColor: theme.centerChannelBg,
            borderBottomWidth: 1,
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
        badge: {
            backgroundColor: theme.buttonBg,
            borderColor: theme.centerChannelBg,
            marginTop: 2,
        },
        buttonsContainer: {
            marginBottom: 12,
            paddingHorizontal: 12,
            flexDirection: 'row',
        },
        iconsContainer: {
            alignItems: 'center',
            flexDirection: 'row',
            marginLeft: 'auto',
        },
    };
});

const Header = ({
    teamId,
    setTeamId,
    onTabSelect,
    onFilterChanged,
    selectedTab,
    selectedFilter,
    teams,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);
    const intl = useIntl();
    const {bottom} = useSafeAreaInsets();
    const isTablet = useIsTablet();

    const messagesText = intl.formatMessage({id: 'screen.search.header.messages', defaultMessage: 'Messages'});
    const filesText = intl.formatMessage({id: 'screen.search.header.files', defaultMessage: 'Files'});
    const title = intl.formatMessage({id: 'screen.search.results.filter.title', defaultMessage: 'Filter by file type'});

    const showFilterIcon = selectedTab === TabTypes.FILES;
    const hasFilters = selectedFilter !== FileFilters.ALL;

    const handleMessagesPress = useCallback(() => {
        onTabSelect(TabTypes.MESSAGES);
    }, [onTabSelect]);

    const handleFilesPress = useCallback(() => {
        onTabSelect(TabTypes.FILES);
    }, [onTabSelect]);

    const snapPoints = useMemo(() => {
        return [
            1,
            bottomSheetSnapPoint(
                NUMBER_FILTER_ITEMS,
                FILTER_ITEM_HEIGHT,
                bottom,
            ) + TITLE_HEIGHT + DIVIDERS_HEIGHT + (isTablet ? TITLE_SEPARATOR_MARGIN_TABLET : TITLE_SEPARATOR_MARGIN),
        ];
    }, []);

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
    }, [onFilterChanged, selectedFilter]);

    const filterStyle = useMemo(() => ({marginRight: teams.length > 1 ? 0 : 8}), [teams.length > 1]);

    return (
        <View style={styles.container}>
            <View style={styles.buttonsContainer}>
                <SelectButton
                    selected={selectedTab === TabTypes.MESSAGES}
                    onPress={handleMessagesPress}
                    text={messagesText}
                />
                <SelectButton
                    selected={selectedTab === TabTypes.FILES}
                    onPress={handleFilesPress}
                    text={filesText}
                />
                <View style={styles.iconsContainer}>
                    {showFilterIcon && (
                        <View style={filterStyle}>
                            <CompassIcon
                                name={'filter-variant'}
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
                    )}
                    {teams.length > 1 && (
                        <TeamPickerIcon
                            size={32}
                            divider={true}
                            setTeamId={setTeamId}
                            teamId={teamId}
                            teams={teams}
                        />
                    )}
                </View>
            </View>
        </View>
    );
};

export default Header;
