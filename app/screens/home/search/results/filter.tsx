// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import MenuItem, {ITEM_HEIGHT} from '@components/menu_item';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import BottomSheetContent from '@screens/bottom_sheet/content';
import {dismissBottomSheet} from '@screens/navigation';
import {FileFilter, FileFilters} from '@utils/file';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const ICON_SIZE = 24;

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
        filterType: FileFilters.ALL,
    }, {
        id: t('screen.search.results.filter.documents'),
        defaultMessage: 'Documents',
        filterType: FileFilters.DOCUMENTS,
    }, {
        id: t('screen.search.results.filter.spreadsheets'),
        defaultMessage: 'Spreadsheets',
        filterType: FileFilters.SPREADSHEETS,
    }, {
        id: t('screen.search.results.filter.presentations'),
        defaultMessage: 'Presentations',
        filterType: FileFilters.PRESENTATIONS,
    }, {
        id: t('screen.search.results.filter.code'),
        defaultMessage: 'Code',
        filterType: FileFilters.CODE,
    }, {
        id: t('screen.search.results.filter.images'),
        defaultMessage: 'Images',
        filterType: FileFilters.IMAGES,
    }, {
        id: t('screen.search.results.filter.audio'),
        defaultMessage: 'Audio',
        filterType: FileFilters.AUDIO,
    }, {
        id: t('screen.search.results.filter.videos'),
        defaultMessage: 'Videos',
        filterType: FileFilters.VIDEOS,
        separator: false,
    },
];

export const NUMBER_FILTER_ITEMS = data.length;
export const FILTER_ITEM_HEIGHT = ITEM_HEIGHT;

type FilterProps = {
    initialFilter: FileFilter;
    setFilter: (filter: FileFilter) => void;
}

const Filter = ({initialFilter, setFilter}: FilterProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const isTablet = useIsTablet();

    const buttonTitle = intl.formatMessage({id: 'screen.search.results.filter.title', defaultMessage: 'Filter by file type'});

    const renderLabelComponent = useCallback((item: FilterItem) => {
        return (
            <View style={style.labelContainer}>
                <FormattedText
                    style={style.menuText}
                    id={item.id}
                    defaultMessage={item.defaultMessage}
                />
                {(initialFilter === item.filterType) && (
                    <CompassIcon
                        name={'check'}
                        size={ICON_SIZE}
                        style={style.selected}
                    />
                )}
            </View>
        );
    }, [style]);

    const handleOnPress = useCallback((fileType: FileFilter) => {
        if (fileType !== initialFilter) {
            setFilter(fileType);
        }
        dismissBottomSheet();
    }, [initialFilter]);

    const renderFilterItem = useCallback(({item}) => {
        return (
            <MenuItem
                labelComponent={renderLabelComponent(item)}
                onPress={() => {
                    handleOnPress(item.filterType);
                }}
                separator={item.separator}
                testID={item.id}
                theme={theme}
            />
        );
    }, [handleOnPress, renderLabelComponent, theme]);

    return (
        <BottomSheetContent
            showButton={false}
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
