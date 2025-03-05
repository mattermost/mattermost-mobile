// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Keyboard, type LayoutChangeEvent, View} from 'react-native';

import SearchBar from '@components/search';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useKeyboardOverlap} from '@hooks/device';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {dismissModal} from '@screens/navigation';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import FilteredList from './filtered_list';
import QuickOptions from './quick_options';
import UnfilteredList from './unfiltered_list';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    closeButtonId: string;
    componentId: AvailableScreens;
}

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

const FindChannels = ({closeButtonId, componentId}: Props) => {
    const theme = useTheme();
    const [term, setTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const styles = getStyleSheet(theme);
    const color = useMemo(() => changeOpacity(theme.centerChannelColor, 0.72), [theme]);
    const listView = useRef<View>(null);

    const [containerHeight, setContainerHeight] = useState(0);
    const overlap = useKeyboardOverlap(listView, containerHeight);

    const cancelButtonProps = useMemo(() => ({
        color,
        buttonTextStyle: {
            ...typography('Body', 100),
        },
    }), [color]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

    const close = useCallback(() => {
        Keyboard.dismiss();
        return dismissModal({componentId});
    }, []);

    const onCancel = useCallback(() => {
        dismissModal({componentId});
    }, []);

    const onChangeText = useCallback((text: string) => {
        setTerm(text);
        if (!text) {
            setLoading(false);
        }
    }, []);

    useNavButtonPressed(closeButtonId, componentId, close, []);
    useAndroidHardwareBackHandler(componentId, close);

    return (
        <View
            style={styles.container}
            testID='find_channels.screen'
            nativeID={SecurityManager.getShieldScreenId(componentId)}
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
            <View
                style={styles.listContainer}
                onLayout={onLayout}
                ref={listView}
            >
                {term === '' &&
                <UnfilteredList
                    close={close}
                    keyboardOverlap={overlap}
                    testID='find_channels.unfiltered_list'
                />
                }
                {Boolean(term) &&
                <FilteredList
                    close={close}
                    keyboardOverlap={overlap}
                    loading={loading}
                    onLoading={setLoading}
                    term={term}
                    testID='find_channels.filtered_list'
                />
                }
            </View>
        </View>
    );
};

export default FindChannels;
