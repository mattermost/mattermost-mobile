// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import MenuItem from '@components/menu_item';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import BottomSheetContent from '@screens/bottom_sheet/content';
import {dismissBottomSheet} from '@screens/navigation';
import {FileFilter} from '@utils/file';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        labelContainer: {
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        menuText: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
    };
});

type FilterItem = {
    id: string;
    defaultMessage: string;
    filterType: FileFilter;
    separator?: boolean;
}

const data: FilterItem[] = [
    {
        id: t('screen.search.results.filter.all_file_types'),
        defaultMessage: 'All file types',
        filterType: 'all',
    }, {
        id: t('screen.search.results.filter.documents'),
        defaultMessage: 'Documents',
        filterType: 'documents',
    }, {
        id: t('screen.search.results.filter.spreadsheets'),
        defaultMessage: 'Spreadsheets',
        filterType: 'spreadsheets',
    }, {
        id: t('screen.search.results.filter.presentations'),
        defaultMessage: 'Presentations',
        filterType: 'presentations',
    }, {
        id: t('screen.search.results.filter.code'),
        defaultMessage: 'Code',
        filterType: 'code',
    }, {
        id: t('screen.search.results.filter.images'),
        defaultMessage: 'Images',
        filterType: 'images',
    }, {
        id: t('screen.search.results.filter.audio'),
        defaultMessage: 'Audio',
        filterType: 'audio',
    }, {
        id: t('screen.search.results.filter.videos'),
        defaultMessage: 'Videos',
        filterType: 'videos',
        separator: false,
    },
];

type FilterProps = {
    initialFilter: FileFilter;
    setFilter: (filter: FileFilter) => void;
}

const Filter = ({initialFilter, setFilter}: FilterProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const isTablet = useIsTablet();

    const [selectedFilter, setSelectedFilter] = useState<FileFilter>(initialFilter);
    const disableButton = selectedFilter === initialFilter;

    const renderLabelComponent = useCallback((item: FilterItem) => {
        return (
            <View style={style.labelContainer}>
                <FormattedText
                    style={style.menuText}
                    id={item.id}
                    defaultMessage={item.defaultMessage}
                />
                {(selectedFilter === item.filterType) && (
                    <CompassIcon
                        style={style.selected}
                        name={'check'}
                        size={24}
                    />
                )}
            </View>
        );
    }, [selectedFilter, style]);

    const renderFilterItem = useCallback(({item}: {item: FilterItem}) => {
        return (
            <MenuItem
                labelComponent={renderLabelComponent(item)}
                onPress={() => {
                    setSelectedFilter(item.filterType);
                }}
                separator={item.separator}
                testID={item.id}
                theme={theme}
            />
        );
    }, [renderLabelComponent, theme]);

    const handleShowResults = useCallback(() => {
        setFilter(selectedFilter);
        dismissBottomSheet();
    }, [selectedFilter, setFilter]);

    const buttonText = intl.formatMessage({id: 'screen.search.results.filter.show_button', defaultMessage: 'Show results'});
    const buttonTitle = intl.formatMessage({id: 'screen.search.results.filter.title', defaultMessage: 'Filter by file type'});

    return (
        <BottomSheetContent
            buttonText={buttonText}
            onPress={handleShowResults}
            disableButton={disableButton}
            showButton={true}
            showTitle={!isTablet}
            testID='search.filters'
            title={buttonTitle}
            titleSeparator={true}
        >
            <View style={style.container}>
                <FlatList
                    data={data}
                    renderItem={renderFilterItem}
                    contentContainerStyle={style.contentContainer}
                />
            </View>
        </BottomSheetContent>
    );
};

export default Filter;
