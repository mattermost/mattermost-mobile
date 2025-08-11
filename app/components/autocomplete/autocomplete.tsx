// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo, useState} from 'react';
import {Platform, type StyleProp, useWindowDimensions, type ViewStyle} from 'react-native';
import Animated, {type SharedValue, useAnimatedStyle, useDerivedValue} from 'react-native-reanimated';

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
            right: 8,
            position: 'absolute',
        },
        borders: {
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            overflow: 'hidden',
            borderRadius: 8,
            elevation: 3,
        },
        shadow: {
            backgroundColor: theme.centerChannelBg,
            shadowColor: '#000',
            shadowOpacity: 1,
            shadowRadius: 6,
            shadowOffset: {
                width: 0,
                height: 6,
            },
        },
        listStyle: {
            backgroundColor: theme.centerChannelBg,
            borderRadius: 4,
            paddingHorizontal: 16,
        },
    };
});

type Props = {
    cursorPosition: number;
    position: SharedValue<number>;
    rootId?: string;
    channelId?: string;
    isSearch?: boolean;
    value: string;
    enableDateSuggestion?: boolean;
    isAppsEnabled: boolean;
    nestedScrollEnabled?: boolean;
    updateValue: (v: string) => void;
    shouldDirectlyReact?: boolean;
    availableSpace: SharedValue<number>;
    growDown?: boolean;
    teamId?: string;
    containerStyle?: StyleProp<ViewStyle>;
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
    shouldDirectlyReact = false,
    growDown = false,
    containerStyle,
    teamId,
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

    const isLandscape = dimensions.width > dimensions.height;
    const maxHeightAdjust = (isTablet && isLandscape) ? MAX_LIST_TABLET_DIFF : 0;
    const defaultMaxHeight = MAX_LIST_HEIGHT - maxHeightAdjust;
    const maxHeight = useDerivedValue(() => {
        return Math.min(availableSpace.value, defaultMaxHeight);
    }, [defaultMaxHeight]);

    const containerAnimatedStyle = useAnimatedStyle(() => {
        return growDown ?
            {top: position.value, bottom: Platform.OS === 'ios' ? 'auto' : undefined, maxHeight: maxHeight.value} :
            {top: Platform.OS === 'ios' ? 'auto' : undefined, bottom: position.value, maxHeight: maxHeight.value};
    }, [growDown, position]);

    const containerStyles = useMemo(() => {
        const s: StyleProp<ViewStyle> = [style.base, containerAnimatedStyle];
        if (hasElements) {
            s.push(style.borders);
        }
        if (Platform.OS === 'ios') {
            s.push(style.shadow);
        }
        if (containerStyle) {
            s.push(containerStyle);
        }
        return s;
    }, [hasElements, style, containerStyle, containerAnimatedStyle]);

    return (
        <Animated.View
            testID='autocomplete'
            style={containerStyles}
        >
            {isAppsEnabled && channelId && (
                <AppSlashSuggestion
                    listStyle={style.listStyle}
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
                    listStyle={style.listStyle}
                    updateValue={updateValue}
                    onShowingChange={setShowingAtMention}
                    value={value || ''}
                    nestedScrollEnabled={nestedScrollEnabled}
                    isSearch={isSearch}
                    channelId={channelId}
                    teamId={teamId}
                />
                <ChannelMention
                    cursorPosition={cursorPosition}
                    listStyle={style.listStyle}
                    updateValue={updateValue}
                    onShowingChange={setShowingChannelMention}
                    value={value || ''}
                    nestedScrollEnabled={nestedScrollEnabled}
                    isSearch={isSearch}
                    channelId={channelId}
                    teamId={teamId}
                />
                {!isSearch &&
                    <EmojiSuggestion
                        cursorPosition={cursorPosition}
                        listStyle={style.listStyle}
                        updateValue={updateValue}
                        onShowingChange={setShowingEmoji}
                        value={value || ''}
                        nestedScrollEnabled={nestedScrollEnabled}
                        rootId={rootId}
                        shouldDirectlyReact={shouldDirectlyReact}
                    />
                }
                {showCommands && channelId &&
                    <SlashSuggestion
                        listStyle={style.listStyle}
                        updateValue={updateValue}
                        onShowingChange={setShowingCommand}
                        value={value || ''}
                        nestedScrollEnabled={nestedScrollEnabled}
                        channelId={channelId}
                        rootId={rootId}
                        isAppsEnabled={isAppsEnabled}
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
        </Animated.View>
    );
};

export default Autocomplete;
