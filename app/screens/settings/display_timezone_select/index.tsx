// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {getAllSupportedTimezones} from '@actions/remote/user';
import Search from '@components/search';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getTimezoneRegion} from '@utils/user';

import TimezoneRow from './timezone_row';

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
        searchBar: {
            height: 38,
            marginVertical: 5,
            marginBottom: 32,
        },
        inputContainerStyle: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            paddingHorizontal: 12,
            marginLeft: 12,
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
    selectedTimezone: string;
    onBack: (tz: string) => void;
}
const SelectTimezones = ({selectedTimezone, onBack}: SelectTimezonesProps) => {
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
    const [value, setValue] = useState('');

    const filteredTimezones = (timezonePrefix: string) => {
        if (timezonePrefix.length === 0) {
            return timezones;
        }

        const lowerCasePrefix = timezonePrefix.toLowerCase();

        // if initial scroll index is set when the items change
        // and the index is grater than the amount of items
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
    };

    const onPressTimezone = useCallback((tzne: string) => {
        onBack(tzne);
        popTopScreen();
    }, [onBack]);

    const renderItem = ({item: timezone}: {item: string}) => {
        return (
            <TimezoneRow
                onPressTimezone={onPressTimezone}
                selectedTimezone={selectedTimezone}
                timezone={timezone}
            />
        );
    };

    useEffect(() => {
        // let's get all supported timezones
        const getSupportedTimezones = async () => {
            const allTzs = await getAllSupportedTimezones(serverUrl);
            if (allTzs.length > 0) {
                setTimezones(allTzs);
                const timezoneIndex = allTzs.findIndex((timezone) => timezone === selectedTimezone);
                if (timezoneIndex > 0) {
                    setInitialScrollIndex(timezoneIndex);
                }
            }
        };
        getSupportedTimezones();
    }, []);

    return (
        <SafeAreaView
            edges={EDGES}
            style={styles.container}
            testID='settings.select_timezone.screen'
        >
            <View style={styles.searchBar}>
                <Search
                    autoCapitalize='none'
                    cancelButtonProps={cancelButtonProps}
                    inputContainerStyle={styles.inputContainerStyle}
                    inputStyle={styles.searchBarInput}
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    onChangeText={setValue}
                    placeholder={intl.formatMessage({id: 'search_bar.search.placeholder', defaultMessage: 'Search timezone'})}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    selectionColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    testID='settings.select_timezone.search_bar'
                    value={value}
                />
            </View>
            <FlatList
                data={filteredTimezones(value)}
                getItemLayout={getItemLayout}
                initialScrollIndex={initialScrollIndex}
                keyExtractor={keyExtractor}
                keyboardDismissMode='on-drag'
                keyboardShouldPersistTaps='always'
                removeClippedSubviews={true}
                renderItem={renderItem}
                contentContainerStyle={styles.flexGrow}
            />
        </SafeAreaView>
    );
};

export default SelectTimezones;
