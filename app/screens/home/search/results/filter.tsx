// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
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
        unselected: {
            color: changeOpacity(theme.centerChannelColor, 0.32),
        },
        selected: {
            color: theme.buttonBg,
        },
    };
});

type FilterItem = {
    id: string;
    defaultMessage: string;
    handler: (value: boolean) => void;
    selected: boolean;
}

const Filter = () => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const isTablet = useIsTablet();

    const [filterDocuments, setFilterDocuments] = useState(false);
    const [filterSpreadsheets, setFilterSpreadsheets] = useState(false);
    const [filterPresentations, setFilterPresentations] = useState(false);
    const [filterCode, setFilterCode] = useState(false);
    const [filterImages, setFilterImages] = useState(false);
    const [filterAudio, setFilterAudio] = useState(false);
    const [filterVideos, setFilterVideos] = useState(false);

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
    }, [filterDocuments, filterSpreadsheets, filterPresentations, filterCode, filterImages, filterAudio, filterVideos]);

    const renderLabelComponent = useCallback((item: FilterItem) => {
        return (
            <View style={style.labelContainer}>
                <FormattedText
                    style={style.menuText}
                    id={item.id}
                    defaultMessage={item.defaultMessage}
                />
                <View style={style.icon}>
                    <CompassIcon
                        style={[item.selected ? style.unselected : style.selected]}
                        name={item.selected ? 'circle-outline' : 'check-circle'}
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
                    item.handler(!item.selected);
                }}
                testID={item.id}
                theme={theme}
            />
        );
    }, []);

    const buttonText = intl.formatMessage({id: 'screen.search.results.filter.show_results', defaultMessage: 'Show results'});
    const buttonTitle = intl.formatMessage({id: 'screen.search.results.filter.title', defaultMessage: 'Filter by file type'});

    return (
        <BottomSheetContent
            buttonText={buttonText}
            showButton={true}
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
