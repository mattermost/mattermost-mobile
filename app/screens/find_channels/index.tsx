// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {View} from 'react-native';
import {useAnimatedKeyboard} from 'react-native-keyboard-controller';

import SearchBar from '@components/search';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import {dismissKeyboard} from '@utils/keyboard';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import FilteredList from './filtered_list';
import QuickOptions from './quick_options';
import UnfilteredList from './unfiltered_list';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        marginHorizontal: 20,
        marginTop: 20,
    },
    inputContainerStyle: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.12),
    },
    inputStyle: {
        color: theme.centerChannelColor,
    },
    listContainer: {
        flex: 1,
        marginTop: 8,
    },
}));

const FindChannels = () => {
    const theme = useTheme();
    const [term, setTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const styles = getStyleSheet(theme);
    const color = useMemo(() => changeOpacity(theme.centerChannelColor, 0.72), [theme]);

    const {height: keyboardHeight} = useAnimatedKeyboard();

    const cancelButtonProps = useMemo(() => ({
        color,
        buttonTextStyle: {
            ...typography('Body', 100),
        },
    }), [color]);

    const close = useCallback(async () => {
        await dismissKeyboard();
        navigateBack();
        await new Promise((resolve) => setTimeout(resolve, 250));
    }, []);

    const onCancel = useCallback(() => {
        close();
    }, [close]);

    const onChangeText = useCallback((text: string) => {
        setTerm(text);
        if (!text) {
            setLoading(false);
        }
    }, []);

    useAndroidHardwareBackHandler(Screens.FIND_CHANNELS, close);

    return (
        <View
            style={styles.container}
            testID='find_channels.screen'
        >
            <SearchBar
                autoCapitalize='none'
                autoFocus={true}
                cancelButtonProps={cancelButtonProps}
                clearIconColor={color}
                inputContainerStyle={styles.inputContainerStyle}
                inputStyle={styles.inputStyle}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                onCancel={onCancel}
                onChangeText={onChangeText}
                placeholderTextColor={color}
                searchIconColor={color}
                selectionColor={color}
                showLoading={loading}
                value={term}
                testID='find_channels.search_bar'
            />
            {term === '' && <QuickOptions close={close}/>}
            <View style={styles.listContainer}>
                {term === '' &&
                <UnfilteredList
                    close={close}
                    keyboardHeight={keyboardHeight}
                    testID='find_channels.unfiltered_list'
                />
                }
                {Boolean(term) &&
                <FilteredList
                    close={close}
                    loading={loading}
                    onLoading={setLoading}
                    term={term}
                    testID='find_channels.filtered_list'
                    keyboardHeight={keyboardHeight}
                />
                }
            </View>
        </View>
    );
};

export default FindChannels;
