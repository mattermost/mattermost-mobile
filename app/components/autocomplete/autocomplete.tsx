// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo, useState} from 'react';
import {Keyboard, KeyboardEvent, Platform, useWindowDimensions, View} from 'react-native';

import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import useHeaderHeight from '@hooks/header';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import EmojiSuggestion from './emoji_suggestion/';

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        base: {
            left: 8,
            position: 'absolute',
            right: 8,
        },
        borders: {
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            overflow: 'hidden',
            borderRadius: 4,
        },
        hidden: {
            display: 'none',
        },
        searchContainer: {
            ...Platform.select({
                android: {
                    top: 42,
                },
                ios: {
                    top: 55,
                },
            }),
        },
        shadow: {
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 8,
            shadowOffset: {
                width: 0,
                height: 8,
            },
        },
    };
});

type Props = {
    cursorPosition: number;
    postInputTop: number;
    rootId: string;
    channelId: string;
    isSearch?: boolean;
    value: string;
    enableDateSuggestion?: boolean;
    isAppsEnabled: boolean;
    offsetY?: number;
    nestedScrollEnabled?: boolean;
    updateValue: (v: string) => void;
    hasFilesAttached: boolean;
}

const OFFSET_IPAD = 60;
const AUTOCOMPLETE_MARGIN = 20;

const Autocomplete = ({
    cursorPosition,
    postInputTop,
    rootId,

    //channelId,
    isSearch = false,
    value,

    //enableDateSuggestion = false,
    isAppsEnabled,
    offsetY = 60,
    nestedScrollEnabled = false,
    updateValue,
    hasFilesAttached,
}: Props) => {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const style = getStyleFromTheme(theme);
    const {height: deviceHeight} = useWindowDimensions();
    const {defaultHeight: headerHeight} = useHeaderHeight(false, true, false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // const [showingAtMention, setShowingAtMention] = useState(false);
    // const [showingChannelMention, setShowingChannelMention] = useState(false);
    const [showingEmoji, setShowingEmoji] = useState(false);

    // const [showingCommand, setShowingCommand] = useState(false);
    // const [showingAppCommand, setShowingAppCommand] = useState(false);
    // const [showingDate, setShowingDate] = useState(false);

    const hasElements = showingEmoji; // || showingAtMention || showingChannelMention || showingCommand || showingAppCommand || showingDate;
    const appsTakeOver = false; // showingAppCommand;

    const maxListHeight = useMemo(() => {
        const postInputHeight = deviceHeight - postInputTop;
        let offset = 0;
        if (Platform.OS === 'ios' && isTablet) {
            offset = OFFSET_IPAD;
        }

        if (keyboardHeight) {
            return (deviceHeight - (postInputHeight + headerHeight + AUTOCOMPLETE_MARGIN + offset));
        }
        return (deviceHeight - (postInputHeight + headerHeight + AUTOCOMPLETE_MARGIN + offset)) / 2;
    }, [postInputTop, deviceHeight, headerHeight, isTablet]); // We don't depend on keyboardHeight to avoid visual artifacts due to postInputTop and keyboardHeight not being updated in the same render.

    const wrapperStyles = useMemo(() => {
        const s = [];
        if (Platform.OS === 'ios') {
            s.push(style.shadow);
        }

        if (isSearch) {
            s.push(style.base, style.searchContainer, {height: maxListHeight});
        }

        if (!hasElements) {
            s.push(style.hidden);
        }
        return s;
    }, [style, isSearch && maxListHeight, hasElements]);

    const containerStyles = useMemo(() => {
        const s = [style.borders];
        if (!isSearch) {
            s.push(style.base, {bottom: offsetY});
        }
        if (!hasElements) {
            s.push(style.hidden);
        }
        return s;
    }, [!isSearch && offsetY, hasElements]);

    useEffect(() => {
        const keyboardEvent = (event: KeyboardEvent) => {
            setKeyboardHeight(event.endCoordinates.height);
        };
        const shown = Keyboard.addListener('keyboardDidShow', keyboardEvent);
        const hidden = Keyboard.addListener('keyboardDidHide', keyboardEvent);

        return () => {
            shown.remove();
            hidden.remove();
        };
    }, []);

    return (
        <View
            style={wrapperStyles}
        >
            <View
                testID='autocomplete'
                style={containerStyles}
            >
                {/* {isAppsEnabled && (
                    <AppSlashSuggestion
                        maxListHeight={maxListHeight}
                        updateValue={updateValue}
                        onResultCountChange={setShowingAppCommand}
                        value={value || ''}
                        nestedScrollEnabled={nestedScrollEnabled}
                    />
                )} */}
                {(!appsTakeOver || !isAppsEnabled) && (<>
                    {/* <AtMention
                        cursorPosition={cursorPosition}
                        maxListHeight={maxListHeight}
                        updateValue={updateValue}
                        onResultCountChange={setShowingAtMention}
                        value={value || ''}
                        nestedScrollEnabled={nestedScrollEnabled}
                    />
                    <ChannelMention
                        cursorPosition={cursorPosition}
                        maxListHeight={maxListHeight}
                        updateValue={updateValue}
                        onResultCountChange={setShowingChannelMention}
                        value={value || ''}
                        nestedScrollEnabled={nestedScrollEnabled}
                    /> */}
                    {!isSearch &&
                    <EmojiSuggestion
                        cursorPosition={cursorPosition}
                        maxListHeight={maxListHeight}
                        updateValue={updateValue}
                        onShowingChange={setShowingEmoji}
                        value={value || ''}
                        nestedScrollEnabled={nestedScrollEnabled}
                        rootId={rootId}
                        hasFilesAttached={hasFilesAttached}
                    />
                    }
                    {/* <SlashSuggestion
                        maxListHeight={maxListHeight}
                        updateValue={updateValue}
                        onResultCountChange={setShowingCommand}
                        value={value || ''}
                        nestedScrollEnabled={nestedScrollEnabled}
                    />
                    {(isSearch && enableDateSuggestion) &&
                    <DateSuggestion
                        cursorPosition={cursorPosition}
                        updateValue={updateValue}
                        onResultCountChange={setShowingDate}
                        value={value || ''}
                    />
                    } */}
                </>)}
            </View>
        </View>
    );
};

export default Autocomplete;
