// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo, useState} from 'react';
import {Platform, useWindowDimensions, View} from 'react-native';

import {LIST_BOTTOM, MAX_LIST_DIFF, MAX_LIST_HEIGHT, MAX_LIST_TABLET_DIFF, OFFSET_TABLET} from '@constants/autocomplete';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import AtMention from './at_mention/';
import ChannelMention from './channel_mention/';
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
            borderRadius: 8,
            elevation: 3,
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
            shadowRadius: 6,
            shadowOffset: {
                width: 0,
                height: 6,
            },
        },
    };
});

type Props = {
    cursorPosition: number;
    postInputTop: number;
    rootId: string;
    channelId: string;
    fixedBottomPosition?: boolean;
    isSearch?: boolean;
    value: string;
    enableDateSuggestion?: boolean;
    isAppsEnabled: boolean;
    nestedScrollEnabled?: boolean;
    updateValue: (v: string) => void;
    hasFilesAttached: boolean;
    maxHeightOverride?: number;
}

const Autocomplete = ({
    cursorPosition,
    postInputTop,
    rootId,
    channelId,
    isSearch = false,
    fixedBottomPosition,
    value,
    maxHeightOverride,

    //enableDateSuggestion = false,
    isAppsEnabled,
    nestedScrollEnabled = false,
    updateValue,
    hasFilesAttached,
}: Props) => {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const dimensions = useWindowDimensions();
    const style = getStyleFromTheme(theme);

    const [showingAtMention, setShowingAtMention] = useState(false);
    const [showingChannelMention, setShowingChannelMention] = useState(false);
    const [showingEmoji, setShowingEmoji] = useState(false);

    // const [showingCommand, setShowingCommand] = useState(false);
    // const [showingAppCommand, setShowingAppCommand] = useState(false);
    // const [showingDate, setShowingDate] = useState(false);

    const hasElements = showingChannelMention || showingEmoji || showingAtMention; // || showingCommand || showingAppCommand || showingDate;
    const appsTakeOver = false; // showingAppCommand;

    const maxListHeight = useMemo(() => {
        if (maxHeightOverride) {
            return maxHeightOverride;
        }
        const isLandscape = dimensions.width > dimensions.height;
        const offset = isTablet && isLandscape ? OFFSET_TABLET : 0;
        let postInputDiff = 0;
        if (isTablet && postInputTop && isLandscape) {
            postInputDiff = MAX_LIST_TABLET_DIFF;
        } else if (postInputTop) {
            postInputDiff = MAX_LIST_DIFF;
        }
        return MAX_LIST_HEIGHT - postInputDiff - offset;
    }, [maxHeightOverride, postInputTop, isTablet, dimensions.width]);

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
        if (!isSearch && !fixedBottomPosition) {
            const offset = isTablet ? -OFFSET_TABLET : 0;
            s.push(style.base, {bottom: postInputTop + LIST_BOTTOM + offset});
        } else if (fixedBottomPosition) {
            s.push(style.base, {bottom: 0});
        }
        if (!hasElements) {
            s.push(style.hidden);
        }
        return s;
    }, [!isSearch, isTablet, hasElements, postInputTop]);

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
                    <AtMention
                        cursorPosition={cursorPosition}
                        maxListHeight={maxListHeight}
                        updateValue={updateValue}
                        onShowingChange={setShowingAtMention}
                        value={value || ''}
                        nestedScrollEnabled={nestedScrollEnabled}
                        isSearch={isSearch}
                        channelId={channelId}
                    />
                    <ChannelMention
                        cursorPosition={cursorPosition}
                        maxListHeight={maxListHeight}
                        updateValue={updateValue}
                        onShowingChange={setShowingChannelMention}
                        value={value || ''}
                        nestedScrollEnabled={nestedScrollEnabled}
                        isSearch={isSearch}
                    />
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
