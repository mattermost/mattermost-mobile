// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import Search from '@components/search';
import {List} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import NetworkManager from '@managers/network_manager';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getTimezoneRegion} from '@utils/user';

import TimezoneRow from './timezone_row';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        searchBarInput: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'Regular'),
        },
        searchBar: {
            height: 38,
            marginVertical: 5,
        },
    };
});

const EDGES: Edge[] = ['left', 'right'];
const EMPTY_TIMEZONES: string[] = [];
const ITEM_HEIGHT = 45;
const VIEWABILITY_CONFIG = List.VISIBILITY_CONFIG_DEFAULTS;

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

    const [timezones, setTimezones] = useState<string[]>(EMPTY_TIMEZONES);
    const [initialScrollIndex, setInitialScrollIndex] = useState<number>(0);
    const [value, setValue] = useState('');

    const filteredTimezones = (timezonePrefix: string) => {
        if (timezonePrefix.length === 0) {
            return timezones;
        }

        const lowerCasePrefix = timezonePrefix.toLowerCase();

        return timezones.filter((t) => (
            getTimezoneRegion(t).toLowerCase().indexOf(lowerCasePrefix) >= 0 ||
            t.toLowerCase().indexOf(lowerCasePrefix) >= 0
        ));
    };

    const onPressTimezone = (tzne: string) => {
        onBack(tzne);
        popTopScreen();
    };

    const handleTextChanged = (text: string) => {
        setValue(text);
    };

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
            try {
                const client = NetworkManager.getClient(serverUrl);
                const allTzs = await client.getTimezones();
                if (Array.isArray(allTzs)) {
                    setTimezones(allTzs);
                    const timezoneIndex = allTzs.findIndex((timezone) => timezone === selectedTimezone);
                    if (timezoneIndex > 0) {
                        setInitialScrollIndex(timezoneIndex);
                    }
                }
            } catch (error) {
                setTimezones(EMPTY_TIMEZONES);
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
                    containerStyle={styles.searchBarContainer}
                    inputStyle={styles.searchBarInput}
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    onChangeText={handleTextChanged}
                    placeholder={intl.formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
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
                maxToRenderPerBatch={15}
                removeClippedSubviews={true}
                renderItem={renderItem}
                viewabilityConfig={VIEWABILITY_CONFIG}
            />
        </SafeAreaView>
    );
};

export default SelectTimezones;
