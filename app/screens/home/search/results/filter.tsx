// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import MenuItem from '@components/menu_item';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
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

const data = [
    {
        id: 'screen.search.results.filter.all_file_types',
        defaultMessage: 'All file types',
    }, {
        id: 'screen.search.results.filter.documents',
        defaultMessage: 'Documents',
    }, {
        id: 'screen.search.results.filter.spreadsheets',
        defaultMessage: 'Spreadsheets',
    }, {
        id: 'screen.search.results.filter.presentations',
        defaultMessage: 'Presentations',
    }, {
        id: 'screen.search.results.filter.code',
        defaultMessage: 'Code',
    }, {
        id: 'screen.search.results.filter.images',
        defaultMessage: 'Images',
    }, {
        id: 'screen.search.results.filter.audio',
        defaultMessage: 'Audio',
    }, {
        id: 'screen.search.results.filter.videos',
        defaultMessage: 'Videos',
        separator: false,
    },
];

type FilterItem = {
    id: string;
    defaultMessage: string;
    separator?: boolean;
}

type FilterProps = {
    initialFilter: FileFilter;
    setFilter: (filter: FileFilter) => void;
}

const Filter = ({initialFilter, setFilter}: FilterProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const isTablet = useIsTablet();

    const [disableButton, setDisableButton] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState<FileFilter>(initialFilter);

    const renderLabelComponent = useCallback((item: FilterItem) => {
        return (
            <View style={style.labelContainer}>
                <FormattedText
                    style={style.menuText}
                    id={item.id}
                    defaultMessage={item.defaultMessage}
                />
                {(selectedFilter === item.defaultMessage) && (
                    <CompassIcon
                        style={style.selected}
                        name={'check'}
                        size={24}
                    />
                )}
            </View>
        );
    }, [selectedFilter, setSelectedFilter]);

    const renderFilterItem = useCallback(({item}) => {
        return (
            <MenuItem
                labelComponent={renderLabelComponent(item)}
                onPress={() => {
                    setSelectedFilter(item.defaultMessage);
                }}
                separator={item.separator}
                testID={item.id}
                theme={theme}
            />
        );
    }, [renderLabelComponent, setSelectedFilter, theme]);

    const handleShowResults = useCallback(() => {
        dismissBottomSheet();
    }, []);

    useEffect(() => {
        setDisableButton(selectedFilter === initialFilter);
    }, [initialFilter, selectedFilter]);

    useEffect(() => {
        return function cleanup() {
            setFilter(selectedFilter);
        };
    }, [selectedFilter]);

    const buttonText = intl.formatMessage({id: 'screen.search.results.filter.show_results', defaultMessage: 'Show results'});
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
