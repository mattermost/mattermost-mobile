// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo, useState} from 'react';
import {Platform, useWindowDimensions, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {LIST_BOTTOM, MAX_LIST_DIFF, MAX_LIST_HEIGHT, MAX_LIST_TABLET_DIFF} from '@constants/autocomplete';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import AtMention from './at_mention/';
import ChannelMention from './channel_mention/';
import EmojiSuggestion from './emoji_suggestion/';
import SlashSuggestion from './slash_suggestion/';
import AppSlashSuggestion from './slash_suggestion/app_slash_suggestion/';

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
    rootId?: string;
    channelId?: string;
    fixedBottomPosition?: boolean;
    isSearch?: boolean;
    value: string;
    enableDateSuggestion?: boolean;
    isAppsEnabled: boolean;
    nestedScrollEnabled?: boolean;
    updateValue: (v: string) => void;
    hasFilesAttached?: boolean;
    maxHeightOverride?: number;
    inPost?: boolean;
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
    inPost = false,
}: Props) => {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const dimensions = useWindowDimensions();
    const style = getStyleFromTheme(theme);
    const insets = useSafeAreaInsets();

    const [showingAtMention, setShowingAtMention] = useState(false);
    const [showingChannelMention, setShowingChannelMention] = useState(false);
    const [showingEmoji, setShowingEmoji] = useState(false);
    const [showingCommand, setShowingCommand] = useState(false);
    const [showingAppCommand, setShowingAppCommand] = useState(false);

    // const [showingDate, setShowingDate] = useState(false);

    const hasElements = showingChannelMention || showingEmoji || showingAtMention || showingCommand || showingAppCommand; // || showingDate;
    const appsTakeOver = showingAppCommand;
    const showCommands = !(showingChannelMention || showingEmoji || showingAtMention);

    const maxListHeight = useMemo(() => {
        if (maxHeightOverride) {
            return maxHeightOverride;
        }
        const isLandscape = dimensions.width > dimensions.height;
        let postInputDiff = 0;
        if (isTablet && postInputTop && isLandscape) {
            postInputDiff = MAX_LIST_TABLET_DIFF;
        } else if (postInputTop) {
            postInputDiff = MAX_LIST_DIFF;
        }
        return MAX_LIST_HEIGHT - postInputDiff;
    }, [maxHeightOverride, postInputTop, isTablet, dimensions.width]);

    const wrapperStyles = useMemo(() => {
        const s = [];
        if (Platform.OS === 'ios') {
            s.push(style.shadow);
        }
        if (isSearch) {
            s.push(style.base, style.searchContainer, {height: maxListHeight});
        }
        return s;
    }, [style, isSearch && maxListHeight, hasElements]);

    const containerStyles = useMemo(() => {
        const s = [];
        if (!isSearch && !fixedBottomPosition) {
            const iOSInsets = Platform.OS === 'ios' && (!isTablet || rootId) ? insets.bottom : 0;
            s.push(style.base, {bottom: postInputTop + LIST_BOTTOM + iOSInsets});
        } else if (fixedBottomPosition) {
            s.push(style.base, {bottom: 0});
        }
        if (hasElements) {
            s.push(style.borders);
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
                {isAppsEnabled && channelId && (
                    <AppSlashSuggestion
                        maxListHeight={maxListHeight}
                        updateValue={updateValue}
                        onShowingChange={setShowingAppCommand}
                        value={value || ''}
                        nestedScrollEnabled={nestedScrollEnabled}
                        channelId={channelId}
                        rootId={rootId}
                    />
                )}
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
                        inPost={inPost}
                    />
                    }
                    {showCommands && channelId &&
                    <SlashSuggestion
                        maxListHeight={maxListHeight}
                        updateValue={updateValue}
                        onShowingChange={setShowingCommand}
                        value={value || ''}
                        nestedScrollEnabled={nestedScrollEnabled}
                        channelId={channelId}
                        rootId={rootId}
                    />
                    }
                    {/* {(isSearch && enableDateSuggestion) &&
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
