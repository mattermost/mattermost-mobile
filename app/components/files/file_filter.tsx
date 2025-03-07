// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {type ListRenderItemInfo, View} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';

import OptionItem, {ITEM_HEIGHT} from '@components/option_item';
import {useTheme} from '@context/theme';
import {useBottomSheetListsFix} from '@hooks/bottom_sheet_lists_fix';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import BottomSheetContent from '@screens/bottom_sheet/content';
import {dismissBottomSheet} from '@screens/navigation';
import {type FileFilter, FileFilters} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            height: 1,
        },
    };
});

type FilterItem = {
    id: string;
    defaultMessage: string;
    filterType: FileFilter;
    separator?: boolean;
}
export const FilterData = {
    [FileFilters.ALL]: {
        id: t('screen.search.results.filter.all_file_types'),
        defaultMessage: 'All file types',
        filterType: FileFilters.ALL,
    },
    [FileFilters.DOCUMENTS]: {
        id: t('screen.search.results.filter.documents'),
        defaultMessage: 'Documents',
        filterType: FileFilters.DOCUMENTS,
    },
    [FileFilters.SPREADSHEETS]: {
        id: t('screen.search.results.filter.spreadsheets'),
        defaultMessage: 'Spreadsheets',
        filterType: FileFilters.SPREADSHEETS,
    },
    [FileFilters.PRESENTATIONS]: {
        id: t('screen.search.results.filter.presentations'),
        defaultMessage: 'Presentations',
        filterType: FileFilters.PRESENTATIONS,
    },
    [FileFilters.CODE]: {
        id: t('screen.search.results.filter.code'),
        defaultMessage: 'Code',
        filterType: FileFilters.CODE,
    },
    [FileFilters.IMAGES]: {
        id: t('screen.search.results.filter.images'),
        defaultMessage: 'Images',
        filterType: FileFilters.IMAGES,
    },
    [FileFilters.AUDIO]: {
        id: t('screen.search.results.filter.audio'),
        defaultMessage: 'Audio',
        filterType: FileFilters.AUDIO,
    },
    [FileFilters.VIDEOS]: {
        id: t('screen.search.results.filter.videos'),
        defaultMessage: 'Videos',
        filterType: FileFilters.VIDEOS,
        separator: false,
    },
};

const data: FilterItem[] = Object.values(FilterData);

export const NUMBER_FILTER_ITEMS = data.length;
export const FILTER_ITEM_HEIGHT = ITEM_HEIGHT;
export const DIVIDERS_HEIGHT = data.length - 1;

type FilterProps = {
    initialFilter: FileFilter;
    setFilter: (filter: FileFilter) => void;
    title: string;
}

const File_filter = ({initialFilter, setFilter, title}: FilterProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const isTablet = useIsTablet();
    const {enabled, panResponder} = useBottomSheetListsFix();

    const handleOnPress = useCallback((fileType: FileFilter) => {
        if (fileType !== initialFilter) {
            setFilter(fileType);
        }
        dismissBottomSheet();
    }, [initialFilter]);

    const separator = useCallback(() => <View style={style.divider}/>, [style]);

    const renderFilterItem = useCallback(({item}: ListRenderItemInfo<FilterItem>) => {
        return (
            <OptionItem
                label={intl.formatMessage({id: item.id, defaultMessage: item.defaultMessage})}
                type={'select'}
                action={() => handleOnPress(item.filterType)}
                selected={initialFilter === item.filterType}
            />
        );
    }, [handleOnPress, initialFilter, theme]);

    return (
        <BottomSheetContent
            showButton={false}
            showTitle={!isTablet}
            testID='search.filters'
            title={title}
        >
            <View>
                <FlatList
                    data={data}
                    renderItem={renderFilterItem}
                    ItemSeparatorComponent={separator}
                    scrollEnabled={enabled}
                    {...panResponder.panHandlers}
                />
            </View>
        </BottomSheetContent>
    );
};

export default File_filter;
