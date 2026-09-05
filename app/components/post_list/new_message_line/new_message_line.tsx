// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Platform, Pressable, type StyleProp, View, type ViewStyle} from 'react-native';

import UnreadsSummarizeSheet from '@agents/components/unreads_summarize_sheet';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {usePreventDoubleTap} from '@hooks/utils';
import {bottomSheet} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {AvailableScreens} from '@typings/screens/navigation';

type NewMessagesLineProps = {
    style?: StyleProp<ViewStyle>;
    theme: Theme;
    testID?: string;
    channelId: string;
    lastViewedAt: number;

    // Consumed by the enhanced wrapper (index.ts) to gate canSummarizeUnreads
    // to the channel view; passed through to keep the call site typed.
    location: AvailableScreens;
    canSummarizeUnreads: boolean;
}

// The pill is 24pt tall; extend the touch target to >=44pt (iOS HIG).
const ASK_AI_HIT_SLOP = {top: 10, bottom: 10, left: 8, right: 8};

const SHEET_SNAP_POINTS: Array<string | number> = [1, Platform.select({ios: '60%', default: '40%'})];

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            alignItems: 'center',
            flexDirection: 'row',
            height: 28,
            paddingHorizontal: 16,
        },
        textContainer: {
            marginHorizontal: 8,
        },
        line: {
            flex: 1,
            height: 1,
            backgroundColor: theme.newMessageSeparator,
        },
        text: {
            color: theme.newMessageSeparator,
            marginHorizontal: 4,
            ...typography('Body', 75, 'SemiBold'),
        },
        askAiPill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            height: 24,
            paddingHorizontal: 10,
            borderRadius: 4,
            marginRight: 8,
            backgroundColor: changeOpacity(theme.newMessageSeparator, 0.08),
        },
        askAiPillPressed: {
            backgroundColor: changeOpacity(theme.newMessageSeparator, 0.16),
        },
        askAiText: {
            color: theme.newMessageSeparator,
            ...typography('Body', 50, 'SemiBold'),
        },
    };
});

function NewMessagesLine({style, testID, theme, channelId, lastViewedAt, canSummarizeUnreads}: NewMessagesLineProps) {
    const styles = getStyleFromTheme(theme);

    const openSheet = useCallback(() => {
        const renderContent = () => (
            <UnreadsSummarizeSheet
                channelId={channelId}
                lastViewedAt={lastViewedAt}
            />
        );

        bottomSheet(renderContent, SHEET_SNAP_POINTS);
    }, [channelId, lastViewedAt]);

    const onAskAiPress = usePreventDoubleTap(openSheet);

    return (
        <View style={[styles.container, style]}>
            <View style={styles.line}/>
            <View style={styles.textContainer}>
                <FormattedText
                    id='posts_view.newMsg'
                    defaultMessage='New Messages'
                    style={styles.text}
                    testID={testID}
                />
            </View>
            {canSummarizeUnreads && (
                <Pressable
                    onPress={onAskAiPress}
                    hitSlop={ASK_AI_HIT_SLOP}
                    style={({pressed}) => [styles.askAiPill, pressed && styles.askAiPillPressed]}
                    testID={`${testID}.ask_ai`}
                >
                    <CompassIcon
                        name='creation-outline'
                        size={14}
                        color={theme.newMessageSeparator}
                    />
                    <FormattedText
                        id='agents.unreads_summarize.ask_ai'
                        defaultMessage='Ask AI'
                        style={styles.askAiText}
                    />
                </Pressable>
            )}
            <View style={styles.line}/>
        </View>
    );
}

export default NewMessagesLine;
