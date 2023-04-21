// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {View, TextInput, type LayoutChangeEvent} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity, getKeyboardAppearanceFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const SEARCH_BAR_TITLE_MARGIN_TOP = 24;
const SEARCH_BAR_MARGIN_TOP = 16;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            display: 'flex',
        },
        searchBarTitleText: {
            marginHorizontal: 20,
            marginTop: SEARCH_BAR_TITLE_MARGIN_TOP,
            color: theme.centerChannelColor,
            ...typography('Heading', 700, 'SemiBold'),
        },
        searchBar: {
            marginHorizontal: 20,
            marginTop: SEARCH_BAR_MARGIN_TOP,
        },
        searchInput: {
            height: 48,
            backgroundColor: 'transparent',
            ...typography('Body', 200, 'Regular'),
            lineHeight: 20,
            color: theme.centerChannelColor,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            borderRadius: 4,
            paddingHorizontal: 16,
        },
        searchInputPlaceholder: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
    };
});

type SelectionSearchBarProps = {
    term: string;
    onSearchChange: (text: string) => void;
    onLayoutContainer: (e: LayoutChangeEvent) => void;
}

export default function SelectionSearchBar({
    term,
    onSearchChange,
    onLayoutContainer,
}: SelectionSearchBarProps) {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [isFocused, setIsFocused] = useState(false);

    const onLayoutSearchBar = useCallback((e: LayoutChangeEvent) => {
        onLayoutContainer(e);
    }, [onLayoutContainer]);

    const onTextInputFocus = () => {
        setIsFocused(true);
    };

    const onTextInputBlur = () => {
        setIsFocused(false);
    };

    const handleSearchChange = (text: string) => {
        onSearchChange(text);
    };

    const searchInputStyle = useMemo(() => {
        const style = [];

        style.push(styles.searchInput);

        if (isFocused) {
            style.push({
                borderWidth: 2,
                borderColor: theme.buttonBg,
            });
        }

        return style;
    }, [isFocused, styles]);

    return (
        <View
            style={styles.container}
            onLayout={onLayoutSearchBar}
            testID='invite.search_bar'
        >
            <FormattedText
                id='invite.sendInvitationsTo'
                defaultMessage='Send invitations to…'
                style={styles.searchBarTitleText}
                testID='invite.search_bar_title'
            />
            <View style={styles.searchBar}>
                <TextInput
                    autoCorrect={false}
                    autoCapitalize={'none'}
                    autoFocus={true}
                    blurOnSubmit={false}
                    disableFullscreenUI={true}
                    enablesReturnKeyAutomatically={true}
                    returnKeyType='search'
                    style={searchInputStyle}
                    placeholder={formatMessage({id: 'invite.searchPlaceholder', defaultMessage: 'Type a name or email address…'})}
                    placeholderTextColor={styles.searchInputPlaceholder.color}
                    onChangeText={handleSearchChange}
                    onFocus={onTextInputFocus}
                    onBlur={onTextInputBlur}
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    value={term}
                    pointerEvents='auto'
                    underlineColorAndroid='transparent'
                    testID='invite.search_bar_input'
                />
            </View>
        </View>
    );
}
