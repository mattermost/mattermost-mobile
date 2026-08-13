// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {type ListRenderItemInfo, View} from 'react-native';

import OptionItem, {ITEM_HEIGHT} from '@components/option_item';
import {useTheme} from '@context/theme';
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

const filterMessages = defineMessages({
    allFileTypes: {
        id: 'screen.search.results.filter.all_file_types',
        defaultMessage: 'All file types',
    },
    documents: {
        id: 'screen.search.results.filter.documents',
        defaultMessage: 'Documents',
    },
    spreadsheets: {
        id: 'screen.search.results.filter.spreadsheets',
        defaultMessage: 'Spreadsheets',
    },
    presentations: {
        id: 'screen.search.results.filter.presentations',
        defaultMessage: 'Presentations',
    },
    code: {
        id: 'screen.search.results.filter.code',
        defaultMessage: 'Code',
    },
    images: {
        id: 'screen.search.results.filter.images',
        defaultMessage: 'Images',
    },
    audio: {
        id: 'screen.search.results.filter.audio',
        defaultMessage: 'Audio',
    },
    videos: {
        id: 'screen.search.results.filter.videos',
        defaultMessage: 'Videos',
    },
});

type FilterItem = {
    id: string;
    defaultMessage: string;
    filterType: FileFilter;
    separator?: boolean;
}
export const FilterData = {
    [FileFilters.ALL]: {
        ...filterMessages.allFileTypes,
        filterType: FileFilters.ALL,
    },
    [FileFilters.DOCUMENTS]: {
        ...filterMessages.documents,
        filterType: FileFilters.DOCUMENTS,
    },
    [FileFilters.SPREADSHEETS]: {
        ...filterMessages.spreadsheets,
        filterType: FileFilters.SPREADSHEETS,
    },
    [FileFilters.PRESENTATIONS]: {
        ...filterMessages.presentations,
        filterType: FileFilters.PRESENTATIONS,
    },
    [FileFilters.CODE]: {
        ...filterMessages.code,
        filterType: FileFilters.CODE,
    },
    [FileFilters.IMAGES]: {
        ...filterMessages.images,
        filterType: FileFilters.IMAGES,
    },
    [FileFilters.AUDIO]: {
        ...filterMessages.audio,
        filterType: FileFilters.AUDIO,
    },
    [FileFilters.VIDEOS]: {
        ...filterMessages.videos,
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

    const handleOnPress = useCallback((fileType: FileFilter) => {
        if (fileType !== initialFilter) {
            setFilter(fileType);
        }
        dismissBottomSheet();
    }, [initialFilter, setFilter]);

    const separator = useCallback(() => <View style={style.divider}/>, [style]);

    const renderFilterItem = useCallback(({item}: ListRenderItemInfo<FilterItem>) => {
        return (
            <OptionItem
                label={intl.formatMessage(item)}
                type={'select'}
                action={() => handleOnPress(item.filterType)}
                selected={initialFilter === item.filterType}
            />
        );
    }, [handleOnPress, initialFilter, intl]);

    return (
        <BottomSheetContent
            showButton={false}
            showTitle={true}
            testID='search.filters'
            title={title}
        >
            <BottomSheetFlatList
                data={data}
                renderItem={renderFilterItem}
                ItemSeparatorComponent={separator}
            />
        </BottomSheetContent>
    );
};

export default File_filter;
