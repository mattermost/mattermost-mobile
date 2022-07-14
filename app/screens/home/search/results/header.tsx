// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {bottomSheetSnapPoint} from '@app/utils/helpers';
import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {SEPARATOR_MARGIN, SEPARATOR_MARGIN_TABLET, TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import {bottomSheet} from '@screens/navigation';
import {FileFilter, FileFilters} from '@utils/file';
import {TabTypes, TabType} from '@utils/search';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Filter, {DIVIDERS_HEIGHT, FILTER_ITEM_HEIGHT, NUMBER_FILTER_ITEMS} from './filter';
import SelectButton from './header_button';

const HEADER_HEIGHT = 64;

type Props = {
    onTabSelect: (tab: TabType) => void;
    onFilterChanged: (filter: FileFilter) => void;
    selectedTab: TabType;
    selectedFilter: FileFilter;
    numberMessages: number;
    numberFiles: number;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        flex: {
            flex: 1,
        },
        container: {
            backgroundColor: theme.centerChannelBg,
            marginHorizontal: 12,
            flexDirection: 'row',
            paddingVertical: 12,
            flexGrow: 0,
            height: HEADER_HEIGHT,
            alignItems: 'center',
        },
        filter: {
            marginRight: 12,
            marginLeft: 'auto',
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            height: 1,
        },
    };
});

const Header = ({
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
            ) + TITLE_HEIGHT + DIVIDERS_HEIGHT + (isTablet ? SEPARATOR_MARGIN_TABLET : SEPARATOR_MARGIN),
            10];
    }, []);

    const handleFilterPress = useCallback(() => {
        const renderContent = () => {
            return (
                <Filter
                    initialFilter={selectedFilter}
                    setFilter={onFilterChanged}
                />
            );
        };
        bottomSheet({
            closeButtonId: 'close-search-filters',
            renderContent,
            snapPoints,
            theme,
            title: intl.formatMessage({id: 'mobile.add_team.join_team', defaultMessage: 'Join Another Team'}),
        });
    }, [selectedFilter]);

    return (
        <>
            <View style={styles.container}>
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
                </View>
            </View>
            <View style={styles.divider}/>
        </>

    );
};

export default Header;

