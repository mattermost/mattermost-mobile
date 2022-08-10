// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {TITLE_SEPARATOR_MARGIN, TITLE_SEPARATOR_MARGIN_TABLET, TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import {bottomSheet} from '@screens/navigation';
import {FileFilter, FileFilters} from '@utils/file';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {TabTypes, TabType} from '@utils/search';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import TeamPickerIcon from '../team_picker_icon';

import Filter, {DIVIDERS_HEIGHT, FILTER_ITEM_HEIGHT, NUMBER_FILTER_ITEMS} from './filter';
import SelectButton from './header_button';

type Props = {
    onTabSelect: (tab: TabType) => void;
    onFilterChanged: (filter: FileFilter) => void;
    selectedTab: TabType;
    selectedFilter: FileFilter;
    numberMessages: number;
    numberFiles: number;
    setTeamId: (id: string) => void;
    teamId: string;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            marginTop: 10,
            backgroundColor: theme.centerChannelBg,
            borderBottomWidth: 1,
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
        buttonsContainer: {
            marginBottom: 12,
            paddingHorizontal: 12,
            flexDirection: 'row',
        },
        filter: {
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
    numberMessages,
    numberFiles,
    selectedTab,
    selectedFilter,
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
            bottomSheetSnapPoint(
                NUMBER_FILTER_ITEMS,
                FILTER_ITEM_HEIGHT,
                bottom,
            ) + TITLE_HEIGHT + DIVIDERS_HEIGHT + (isTablet ? TITLE_SEPARATOR_MARGIN_TABLET : TITLE_SEPARATOR_MARGIN),
            10];
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
    }, [selectedFilter]);

    return (
        <View style={styles.container}>
            <View style={styles.buttonsContainer}>
                <SelectButton
                    selected={selectedTab === TabTypes.MESSAGES}
                    onPress={handleMessagesPress}
                    text={`${messagesText} (${numberMessages})`}
                />
                <SelectButton
                    selected={selectedTab === TabTypes.FILES}
                    onPress={handleFilesPress}
                    text={`${filesText} (${numberFiles})`}
                />
                <View
                    style={styles.filter}
                >
                    {showFilterIcon &&
                    <>
                        <CompassIcon
                            name={'filter-variant'}
                            size={24}
                            color={changeOpacity(theme.centerChannelColor, 0.56)}
                            onPress={handleFilterPress}
                        />
                        <Badge
                            borderColor={theme.buttonBg}
                            backgroundColor={theme.buttonBg}
                            visible={hasFilters}
                            testID={'search.filters.badge'}
                            value={-1}
                        />
                    </>
                    }
                    <TeamPickerIcon
                        size={32}
                        divider={true}
                        setTeamId={setTeamId}
                        teamId={teamId}
                    />
                </View>
            </View>
        </View>
    );
};

export default Header;

