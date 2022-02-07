// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo, useState} from 'react';
import {Platform, useWindowDimensions, View} from 'react-native';

import {Device} from '@constants';
import {useTheme} from '@context/theme';
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
    maxHeight: number;
    rootId: string;
    channelId: string;
    isSearch?: boolean;
    value: string;
    enableDateSuggestion?: boolean;
    appsEnabled: boolean;
    offsetY?: number;
    nestedScrollEnabled?: boolean;
    updateValue: (v: string) => void;
}
const Autocomplete = ({
    cursorPosition,
    maxHeight,
    rootId,

    //channelId,
    isSearch = false,
    value,

    //enableDateSuggestion = false,
    appsEnabled,
    offsetY = 80,
    nestedScrollEnabled = false,
    updateValue,
}: Props) => {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const dimensions = useWindowDimensions();
    const deviceHeight = dimensions.height;

    // const [showingAtMention, setShowingAtMention] = useState(false);
    // const [showingChannelMention, setShowingChannelMention] = useState(false);
    const [showingEmoji, setShowingEmoji] = useState(false);

    // const [showingCommand, setShowingCommand] = useState(false);
    // const [showingAppCommand, setSwhoingAppCommand] = useState(false);
    // const [showingDate, setShowingDate] = useState(false);

    const hasElements = showingEmoji; // || showingAtMention || showingChannelMention || showingCommand || showingAppCommand || showingDate;
    const appsTakeOver = false; // showingAppCommand;

    const maxListHeight = useMemo(() => {
        if (maxHeight) {
            return maxHeight;
        }

        // List is expanding downwards, likely from the search box
        let offset = Platform.select({ios: 65, default: 75});
        if (Device.IS_IPHONE_WITH_INSETS) {
            offset = 90;
        }

        return (deviceHeight / 2) - offset;
    }, [maxHeight, deviceHeight]);

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
    }, [theme, isSearch, hasElements, maxListHeight]);

    const containerStyles = useMemo(() => {
        const s = [style.borders];
        if (!isSearch) {
            s.push(style.base, {bottom: offsetY});
        }
        if (!hasElements) {
            s.push(style.hidden);
        }
        return s;
    }, [isSearch, offsetY, hasElements]);

    return (
        <View
            style={wrapperStyles}
        >
            <View
                testID='autocomplete'
                style={containerStyles}
            >
                {/* {appsEnabled && (
                    <AppSlashSuggestion
                        maxListHeight={maxListHeight}
                        updateValue={updateValue}
                        onResultCountChange={setSwhoingAppCommand}
                        value={value || ''}
                        nestedScrollEnabled={nestedScrollEnabled}
                    />
                )} */}
                {(!appsTakeOver || !appsEnabled) && (<>
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
