// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import Button from 'react-native-button';
import {FlatList} from 'react-native-gesture-handler';

import CompassIcon from '@app/components/compass_icon';
import FormattedText from '@components/formatted_text';
import MenuItem from '@components/menu_item';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import BottomSheetContent from '@screens/bottom_sheet/content';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        labelContainer: {
            aligntItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        contentContainer: {
            marginVertical: 4,
            marginHorizontal: 20,
        },
        menuText: {
            ...typography('Body', 200, 'Regular'),
        },
        icon: {
            marginRight: 12,
        },
        selected: {
            color: theme.buttonBg,
        },
        unselected: {
            color: changeOpacity(theme.centerChannelColor, 0.32),
        },
    };
});

type FilterItem = {
    id: string;
    defaultMessage: string;
    handler: (value: boolean) => void;
    selected: boolean;
}

type FilterProps = {
    filterDocuments: boolean;
    filterSpreadsheets: boolean;
    filterPresentations: boolean;
    filterCode: boolean;
    filterImages: boolean;
    filterAudio: boolean;
    filterVideos: boolean;

    setFilterDocuments: (selected: boolean) => void;
    setFilterSpreadsheets: (selected: boolean) => void;
    setFilterPresentations: (selected: boolean) => void;
    setFilterCode: (selected: boolean) => void;
    setFilterImages: (selected: boolean) => void;
    setFilterAudio: (selected: boolean) => void;
    setFilterVideos: (selected: boolean) => void;
}

const Filter = ({
    filterDocuments, setFilterDocuments,
    filterSpreadsheets, setFilterSpreadsheets,
    filterPresentations, setFilterPresentations,
    filterCode, setFilterCode,
    filterImages, setFilterImages,
    filterAudio, setFilterAudio,
    filterVideos, setFilterVideos,
}: FilterProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const isTablet = useIsTablet();
    const data = useMemo(() => {
        return [
            {
                id: 'screen.search.results.filter.documents',
                defaultMessage: 'Documents',
                handler: setFilterDocuments,
                selected: filterDocuments,
            }, {
                id: 'screen.search.results.filter.spreadsheets',
                defaultMessage: 'Spreadsheets',
                handler: setFilterSpreadsheets,
                selected: filterSpreadsheets,
            }, {
                id: 'screen.search.results.filter.presentations',
                defaultMessage: 'Presentations',
                handler: setFilterPresentations,
                selected: filterPresentations,
            }, {
                id: 'screen.search.results.filter.code',
                defaultMessage: 'Code',
                handler: setFilterCode,
                selected: filterCode,
            }, {
                id: 'screen.search.results.filter.images',
                defaultMessage: 'Images',
                handler: setFilterImages,
                selected: filterImages,
            }, {
                id: 'screen.search.results.filter.audio',
                defaultMessage: 'Audio',
                handler: setFilterAudio,
                selected: filterAudio,
            }, {
                id: 'screen.search.results.filter.videos',
                defaultMessage: 'Videos',
                handler: setFilterVideos,
                selected: filterVideos,
            },
        ];
    }, [
        filterDocuments, setFilterDocuments,
        filterSpreadsheets, setFilterSpreadsheets,
        filterPresentations, setFilterPresentations,
        filterCode, setFilterCode,
        filterImages, setFilterImages,
        filterAudio, setFilterAudio,
        filterVideos, setFilterVideos,
    ]);

    const renderLabelComponent = useCallback((item: FilterItem) => {
        console.log('item', item);
        return (
            <View style={style.labelContainer}>
                <FormattedText
                    style={style.menuText}
                    id={item.id}
                    defaultMessage={item.defaultMessage}
                />
                <View style={style.icon}>
                    <CompassIcon
                        style={[item.selected ? style.selected : style.unselected]}
                        name={item.selected ? 'check-circle' : 'circle-outline'}
                        size={31.2}
                        color={'blue'}
                    />
                </View>
            </View>
        );
    }, []);

    const renderFilterItem = useCallback(({item}) => {
        return (
            <MenuItem
                labelComponent={renderLabelComponent(item)}
                onPress={() => {
                    console.log('item.selected', item.selected);
                    item.handler(!item.selected);
                }}
                testID={item.id}
                theme={theme}
            />
        );
    }, [data,
        filterDocuments, setFilterDocuments,
        filterSpreadsheets, setFilterSpreadsheets,
        filterPresentations, setFilterPresentations,
        filterCode, setFilterCode,
        filterImages, setFilterImages,
        filterAudio, setFilterAudio,
        filterVideos, setFilterVideos,
        renderLabelComponent]);

    const renderTitleComponent = useCallback(() => {
        return (
            <Button>
                <FormattedText
                    style={style.menuText}
                    id={'screen.search.results.filter.clear_all'}
                    defaultMessage={'Clear all'}
                />
            </Button>
        );
    }, []);

    // const enableButton = useCallBack(() => {
    //     const enabled =
    // }, [data]);

    const buttonText = intl.formatMessage({id: 'screen.search.results.filter.show_results', defaultMessage: 'Show results'});
    const buttonTitle = intl.formatMessage({id: 'screen.search.results.filter.title', defaultMessage: 'Filter by file type'});

    return (
        <BottomSheetContent
            disableButton={true}
            buttonText={buttonText}
            showButton={true}
            rightTitleComponent={renderTitleComponent()}

            //            buttonIcon={'plus'}
            showTitle={!isTablet}
            testID='search.filters'
            title={buttonTitle}
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
