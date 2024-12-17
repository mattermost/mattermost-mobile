// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import Filter, {DIVIDERS_HEIGHT, FILTER_ITEM_HEIGHT, FilterData, NUMBER_FILTER_ITEMS} from '@components/files/file_filter';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import {TITLE_SEPARATOR_MARGIN, TITLE_SEPARATOR_MARGIN_TABLET, TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import {bottomSheet} from '@screens/navigation';
import {type FileFilter, FileFilters} from '@utils/file';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const TEST_ID = 'channel_files';

type Props = {
    onFilterChanged: (filter: FileFilter) => void;
    selectedFilter: FileFilter;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 20,
            backgroundColor: theme.centerChannelBg,
        },
        title: {
            color: theme.centerChannelColor,
            ...typography('Heading', 300, 'SemiBold'),
        },
        badge: {
            backgroundColor: theme.buttonBg,
            borderColor: theme.centerChannelBg,
            marginTop: 2,
        },
        iconsContainer: {
            alignItems: 'center',
            flexDirection: 'row',
            marginLeft: 'auto',
        },
    };
});

const Header = ({
    onFilterChanged,
    selectedFilter,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);
    const intl = useIntl();
    const isTablet = useIsTablet();
    const hasFilters = selectedFilter !== FileFilters.ALL;
    const messageObject = hasFilters ? {
        id: FilterData[selectedFilter].id,
        defaultMessage: FilterData[selectedFilter].defaultMessage,
    } : {
        id: t('screen.channel_files.header.recent_files'),
        defaultMessage: 'Recent Files',
    };

    const messagesText = intl.formatMessage(messageObject);
    const title = intl.formatMessage({id: 'screen.channel_files.results.filter.title', defaultMessage: 'Filter by file type'});

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
    }, [onFilterChanged, selectedFilter]);

    return (
        <View style={styles.container}>
            <Text
                style={styles.title}
                testID={`${TEST_ID}.title`}
            >
                {messagesText}
            </Text>
            <View>
                <CompassIcon
                    name={'filter-variant'}
                    size={24}
                    color={changeOpacity(theme.centerChannelColor, 0.56)}
                    onPress={handleFilterPress}
                />
                <Badge
                    style={styles.badge}
                    visible={hasFilters}
                    testID={`${TEST_ID}.filters.badge`}
                    value={-1}
                />
            </View>
        </View>
    );
};

export default Header;

