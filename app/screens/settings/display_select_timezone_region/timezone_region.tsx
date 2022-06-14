// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import Search from '@components/search';
import {List} from '@constants';
import {useTheme} from '@context/theme';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
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
            fontSize: 15,
        },

        searchBar: {
            height: 38,
            marginVertical: 5,
        },
    };
});

const ITEM_HEIGHT = 45;
const VIEWABILITY_CONFIG = List.VISIBILITY_CONFIG_DEFAULTS;
const edges: Edge[] = ['left', 'right'];
const keyExtractor = (item: string) => item;

type SelectTimezonesProps = {
    selectedTimezone: string;
    initialScrollIndex: number;
    allTimezones: string[];
}
const SelectTimezones = ({allTimezones, selectedTimezone, initialScrollIndex}: SelectTimezonesProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const [timezones, setTimezones] = useState(allTimezones);
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

    const timezoneSelected = (tzne: string) => {
        //fixme:  props.onBack(timezone);
        popTopScreen();
    };

    const handleTextChanged = (text: string) => {
        setValue(text);
    };

    const getItemLayout = (data: string[], index: number) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
    });

    const renderItem = ({item: timezone}: {item: string}) => {
        return (
            <TimezoneRow
                timezone={timezone}
                selectedTimezone={selectedTimezone}
                onPressTimezone={timezoneSelected}
            />
        );
    };

    return (
        <SafeAreaView
            testID='settings.select_timezone.screen'
            edges={edges}
            style={styles.container}
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
                removeClippedSubviews={true}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                getItemLayout={getItemLayout}
                keyboardShouldPersistTaps='always'
                keyboardDismissMode='on-drag'
                maxToRenderPerBatch={15}
                initialScrollIndex={initialScrollIndex}
                viewabilityConfig={VIEWABILITY_CONFIG}
            />
        </SafeAreaView>
    );
};

export default SelectTimezones;
