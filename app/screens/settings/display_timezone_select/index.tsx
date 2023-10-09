// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {FlatList} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {getAllSupportedTimezones} from '@actions/remote/user';
import Search from '@components/search';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getTimezoneRegion} from '@utils/user';

import TimezoneRow from './timezone_row';

import type {AvailableScreens} from '@typings/screens/navigation';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        flexGrow: {
            flexGrow: 1,
        },
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        searchBarInput: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'Regular'),
        },
        searchBarInputContainerStyle: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            height: 38,
        },
        searchBarContainerStyle: {
            paddingHorizontal: 12,
            marginBottom: 32,
            marginTop: 12,
        },
    };
});

const EDGES: Edge[] = ['left', 'right'];
const EMPTY_TIMEZONES: string[] = [];
const ITEM_HEIGHT = 48;
const keyExtractor = (item: string) => item;
const getItemLayout = (_data: string[], index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
});

type SelectTimezonesProps = {
    componentId: AvailableScreens;
    onBack: (tz: string) => void;
    currentTimezone: string;
}
const SelectTimezones = ({componentId, onBack, currentTimezone}: SelectTimezonesProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const cancelButtonProps = useMemo(() => ({
        buttonTextStyle: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 100),
        },
        buttonStyle: {
            marginTop: 12,
        },
    }), [theme.centerChannelColor]);

    const [timezones, setTimezones] = useState<string[]>(EMPTY_TIMEZONES);
    const [initialScrollIndex, setInitialScrollIndex] = useState<number|undefined>();
    const [searchRegion, setSearchRegion] = useState<string|undefined>(undefined);

    const filteredTimezones = useCallback(() => {
        if (!searchRegion) {
            return timezones;
        }
        const lowerCasePrefix = searchRegion.toLowerCase();

        // if initial scroll index is set when the items change
        // and the index is greater than the amount of items
        // the list starts to render partial results until there is
        // and interaction, so setting the index as undefined corrects
        // the rendering
        if (initialScrollIndex) {
            setInitialScrollIndex(undefined);
        }

        return timezones.filter((t) => (
            getTimezoneRegion(t).toLowerCase().indexOf(lowerCasePrefix) >= 0 ||
            t.toLowerCase().indexOf(lowerCasePrefix) >= 0
        ));
    }, [searchRegion, timezones, initialScrollIndex]);

    const close = useCallback((newTimezone?: string) => {
        onBack(newTimezone || currentTimezone);
        popTopScreen(componentId);
    }, [currentTimezone, componentId]);

    const onPressTimezone = useCallback((selectedTimezone: string) => {
        close(selectedTimezone);
    }, []);

    const renderItem = useCallback(({item: timezone}: {item: string}) => {
        return (
            <TimezoneRow
                isSelected={timezone === currentTimezone}
                onPressTimezone={onPressTimezone}
                timezone={timezone}
            />
        );
    }, [currentTimezone, onPressTimezone]);

    useEffect(() => {
        // let's get all supported timezones
        const getSupportedTimezones = async () => {
            const allTzs = await getAllSupportedTimezones(serverUrl);
            if (allTzs.length > 0) {
                setTimezones(allTzs);
                const timezoneIndex = allTzs.findIndex((timezone) => timezone === currentTimezone);
                if (timezoneIndex > 0) {
                    setInitialScrollIndex(timezoneIndex);
                }
            }
        };
        getSupportedTimezones();
    }, []);

    useAndroidHardwareBackHandler(componentId, close);

    return (
        <SafeAreaView
            edges={EDGES}
            style={styles.container}
            testID='select_timezone.screen'
        >
            <Search
                autoCapitalize='none'
                cancelButtonProps={cancelButtonProps}
                inputContainerStyle={styles.searchBarInputContainerStyle}
                containerStyle={styles.searchBarContainerStyle}
                inputStyle={styles.searchBarInput}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                onChangeText={setSearchRegion}
                placeholder={intl.formatMessage({id: 'search_bar.search.placeholder', defaultMessage: 'Search timezone'})}
                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                selectionColor={changeOpacity(theme.centerChannelColor, 0.5)}
                testID='select_timezone.search_bar'
                value={searchRegion}
            />
            <FlatList
                contentContainerStyle={styles.flexGrow}
                data={searchRegion?.length ? filteredTimezones() : timezones}
                getItemLayout={getItemLayout}
                initialScrollIndex={initialScrollIndex}
                keyExtractor={keyExtractor}
                keyboardDismissMode='on-drag'
                keyboardShouldPersistTaps='always'
                removeClippedSubviews={true}
                renderItem={renderItem}
                testID='select_timezone.timezone.flat_list'
            />
        </SafeAreaView>
    );
};

export default SelectTimezones;
