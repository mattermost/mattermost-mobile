// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo, useState} from 'react';
import {Platform, useWindowDimensions, View} from 'react-native';

import {MAX_LIST_HEIGHT, MAX_LIST_TABLET_DIFF} from '@constants/autocomplete';
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
    position: number;
    rootId?: string;
    channelId?: string;
    isSearch?: boolean;
    value: string;
    enableDateSuggestion?: boolean;
    isAppsEnabled: boolean;
    nestedScrollEnabled?: boolean;
    updateValue: (v: string) => void;
    hasFilesAttached?: boolean;
    availableSpace: number;
    inPost?: boolean;
    growDown?: boolean;
}

const Autocomplete = ({
    cursorPosition,
    position,
    rootId,
    channelId,
    isSearch = false,
    value,
    availableSpace,

    //enableDateSuggestion = false,
    isAppsEnabled,
    nestedScrollEnabled = false,
    updateValue,
    hasFilesAttached,
    inPost = false,
    growDown = false,
}: Props) => {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const style = getStyleFromTheme(theme);
    const dimensions = useWindowDimensions();

    const [showingAtMention, setShowingAtMention] = useState(false);
    const [showingChannelMention, setShowingChannelMention] = useState(false);
    const [showingEmoji, setShowingEmoji] = useState(false);
    const [showingCommand, setShowingCommand] = useState(false);
    const [showingAppCommand, setShowingAppCommand] = useState(false);

    // const [showingDate, setShowingDate] = useState(false);

    const hasElements = showingChannelMention || showingEmoji || showingAtMention || showingCommand || showingAppCommand; // || showingDate;
    const appsTakeOver = showingAppCommand;
    const showCommands = !(showingChannelMention || showingEmoji || showingAtMention);

    const wrapperStyles = useMemo(() => {
        const s = [];
        if (Platform.OS === 'ios') {
            s.push(style.shadow);
        }
        return s;
    }, [style]);

    const containerStyles = useMemo(() => {
        const s = [style.base];
        if (growDown) {
            s.push({top: -position});
        } else {
            s.push({bottom: position});
        }
        if (hasElements) {
            s.push(style.borders);
        }
        return s;
    }, [hasElements, position, growDown, style]);

    const isLandscape = dimensions.width > dimensions.height;
    const maxHeightAdjust = (isTablet && isLandscape) ? MAX_LIST_TABLET_DIFF : 0;
    const defaultMaxHeight = MAX_LIST_HEIGHT - maxHeightAdjust;
    const maxListHeight = Math.min(availableSpace, defaultMaxHeight);

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
