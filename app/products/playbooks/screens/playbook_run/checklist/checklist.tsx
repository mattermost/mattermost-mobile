// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {View, Text, TouchableOpacity, type LayoutChangeEvent, useWindowDimensions, StyleSheet} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import ProgressBar from '@playbooks/components/progress_bar';
import {getSortOrder} from '@playbooks/utils/sort_order';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import ChecklistItem from './checklist_item';

import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    checklistContainer: {
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderRadius: 4,
        backgroundColor: theme.centerChannelBg,
        marginVertical: 4,
        overflow: 'hidden',
    },
    checklistHeader: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
    },
    checklistTitle: {
        ...typography('Body', 200, 'SemiBold'),
        color: changeOpacity(theme.centerChannelColor, 0.72),
    },
    chevron: {
        fontSize: 18,
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
    progressText: {
        ...typography('Body', 100, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.48),
        marginTop: 2,
    },
    checklistItemsContainer: {
        paddingVertical: 16,
        paddingHorizontal: 16,
        gap: 16,
    },
    heightCalculator: {
        position: 'absolute',
        opacity: 0,
    },
    checklistHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 8,
    },
}));

type Props = {
    checklist: PlaybookChecklistModel | PlaybookChecklist;
    checklistNumber: number;
    items: Array<PlaybookChecklistItemModel | PlaybookChecklistItem>;
    channelId: string;
    playbookRunId: string;
    isFinished: boolean;
}

const Checklist = ({
    checklist,
    checklistNumber,
    items,
    channelId,
    playbookRunId,
    isFinished,
}: Props) => {
    const [expanded, setExpanded] = useState(true);
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const height = useSharedValue(0);
    const windowDimensions = useWindowDimensions();

    const sortedItems = useMemo(() => {
        if ('table' in checklist) {
            const sortOrder = getSortOrder(items);
            const sortOrderMap = sortOrder.reduce((acc, id, index) => {
                acc[id] = index;
                return acc;
            }, {} as Record<string, number>);
            return items.sort((a, b) => sortOrderMap[a.id] - sortOrderMap[b.id]);
        }

        return items;
    }, [items, checklist]);

    const toggleExpanded = useCallback(() => {
        setExpanded((prev) => !prev);
    }, []);

    const completed = useMemo(() => {
        return items.filter((item) => item.state === 'closed').length;
    }, [items]);

    const progressPercentage = useMemo(() => {
        const total = items.length;

        return total > 0 ? (completed / total) * 100 : 0;
    }, [completed, items.length]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            height: withTiming(expanded ? height.value : 0, {duration: 300}),
            paddingVertical: withTiming(expanded ? 16 : 0, {duration: 300}),
        };
    }, [expanded]);

    const calculatorStyle = useMemo(() => StyleSheet.flatten([
        styles.checklistItemsContainer,
        styles.heightCalculator,
        {left: windowDimensions.width}, // Make sure the calculator is out of the screen
    ]), [styles.checklistItemsContainer, styles.heightCalculator, windowDimensions.width]);

    const calculatorOnLayout = useCallback((event: LayoutChangeEvent) => {
        height.value = event.nativeEvent.layout.height;
    }, [height]);

    return (
        <View style={styles.checklistContainer}>
            <TouchableOpacity
                style={styles.checklistHeader}
                onPress={toggleExpanded}
            >
                <View style={styles.checklistHeaderContent}>
                    <CompassIcon
                        name={expanded ? 'chevron-down' : 'chevron-right'}
                        style={styles.chevron}
                    />
                    <Text style={styles.checklistTitle}>{checklist.title}</Text>
                    <Text style={styles.progressText}>{`${completed} / ${items.length} done`}</Text>
                </View>
                <ProgressBar
                    progress={progressPercentage}
                    isActive={!isFinished}
                />
            </TouchableOpacity>
            <Animated.View
                style={[styles.checklistItemsContainer, animatedStyle]}
            >
                {sortedItems.map((item, index) => (
                    <ChecklistItem
                        key={item.id}
                        item={item}
                        channelId={channelId}
                        checklistNumber={checklistNumber}
                        itemNumber={index}
                        playbookRunId={playbookRunId}
                        isFinished={isFinished}
                    />
                ))}
            </Animated.View>
            {/* This is a hack to get the height of the checklist items */}
            <View
                style={calculatorStyle}
                onLayout={calculatorOnLayout}
            >
                {sortedItems.map((item, index) => (
                    <ChecklistItem
                        key={item.id}
                        item={item}
                        channelId={channelId}
                        checklistNumber={checklistNumber}
                        itemNumber={index}
                        playbookRunId={playbookRunId}
                        isFinished={isFinished}
                    />
                ))}
            </View>
        </View>
    );
};

export default Checklist;
