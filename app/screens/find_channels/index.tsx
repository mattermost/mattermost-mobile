// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {DeviceEventEmitter, Keyboard, View} from 'react-native';
import {Navigation} from 'react-native-navigation';

import SearchBar from '@components/search';
import {Events} from '@constants';
import {useTheme} from '@context/theme';
import {useKeyboardHeight} from '@hooks/device';
import {dismissModal} from '@screens/navigation';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import FilteredList from './filtered_list';
import QuickOptions from './quick_options';
import UnfilteredList from './unfiltered_list';

type Props = {
    closeButtonId: string;
    componentId: string;
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
    const styles = getStyleSheet(theme);
    const color = useMemo(() => changeOpacity(theme.centerChannelColor, 0.72), [theme]);
    const keyboardHeight = useKeyboardHeight();

    const cancelButtonProps = useMemo(() => ({
        color,
        buttonTextStyle: {
            ...typography('Body', 100),
        },
    }), [color]);

    const close = useCallback(() => {
        Keyboard.dismiss();
        DeviceEventEmitter.emit(Events.PAUSE_KEYBOARD_TRACKING_VIEW, false);
        return dismissModal({componentId});
    }, []);

    const onCancel = useCallback(() => {
        dismissModal({componentId});
    }, []);

    const onChangeText = useCallback((text) => {
        setTerm(text);
    }, []);

    useEffect(() => {
        const navigationEvents = Navigation.events().registerNavigationButtonPressedListener(({buttonId}) => {
            if (closeButtonId && buttonId === closeButtonId) {
                close();
            }
        });

        return () => navigationEvents.remove();
    }, []);

    return (
        <View style={styles.container}>
            <SearchBar
                autoCapitalize='none'
                autoFocus={true}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                clearIconColor={color}
                searchIconColor={color}
                cancelButtonProps={cancelButtonProps}
                placeholderTextColor={color}
                inputStyle={styles.inputStyle}
                inputContainerStyle={styles.inputContainerStyle}
                selectionColor={color}
                onCancel={onCancel}
                onChangeText={onChangeText}
                value={term}
            />
            {term === '' && <QuickOptions close={close}/>}
            <View style={styles.listContainer}>
                {term === '' &&
                <UnfilteredList
                    close={close}
                    keyboardHeight={keyboardHeight}
                />
                }
                {Boolean(term) &&
                <FilteredList
                    close={close}
                    keyboardHeight={keyboardHeight}
                    term={term}
                />
                }
            </View>
        </View>
    );
};

export default FindChannels;
