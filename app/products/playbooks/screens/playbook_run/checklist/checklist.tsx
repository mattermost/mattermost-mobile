// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, TouchableOpacity, type GestureResponderEvent, type LayoutChangeEvent, useWindowDimensions, StyleSheet} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {renameChecklist, addChecklistItem} from '@playbooks/actions/remote/checklist';
import ProgressBar from '@playbooks/components/progress_bar';
import {goToRenameChecklist, goToAddChecklistItem} from '@playbooks/screens/navigation';
import {getChecklistProgress} from '@playbooks/utils/progress';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';
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
    editIconContainer: {
        alignItems: 'flex-end',
    },
    editIcon: {
        fontSize: 18,
        color: changeOpacity(theme.centerChannelColor, 0.56),
        paddingHorizontal: 4,
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
    skippedText: {
        textDecorationLine: 'line-through',
    },
    titleContainer: {
        flex: 1,
    },
    progressAndEditContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 'auto',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 6,
    },
    addButtonText: {
        ...typography('Body', 100, 'SemiBold'),
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
    addButtonIcon: {
        fontSize: 18,
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
}));

type Props = {
    checklist: PlaybookChecklistModel | PlaybookChecklist;
    checklistNumber: number;
    items: Array<PlaybookChecklistItemModel | PlaybookChecklistItem>;
    channelId: string;
    playbookRunId: string;
    playbookRunName: string;
    isFinished: boolean;
    isParticipant: boolean;
    checklistProgress: ReturnType<typeof getChecklistProgress>;
}

const Checklist = ({
    checklist,
    checklistNumber,
    items,
    channelId,
    playbookRunId,
    playbookRunName,
    isFinished,
    isParticipant,
    checklistProgress: {
        skipped,
        completed,
        totalNumber,
        progress,
    },
}: Props) => {
    const [expanded, setExpanded] = useState(true);
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const height = useSharedValue(0);
    const windowDimensions = useWindowDimensions();

    const toggleExpanded = useCallback(() => {
        setExpanded((prev) => !prev);
    }, []);

    const handleRename = useCallback(async (newTitle: string) => {
        const res = await renameChecklist(serverUrl, playbookRunId, checklistNumber, checklist.id, newTitle);
        if ('error' in res && res.error) {
            showPlaybookErrorSnackbar();
            logError('error on renameChecklist', getFullErrorMessage(res.error));
        }
    }, [serverUrl, playbookRunId, checklist.id, checklistNumber]);

    const handleEditPress = useCallback((e: GestureResponderEvent) => {
        e.stopPropagation();
        goToRenameChecklist(intl, theme, playbookRunName, checklist.title, handleRename);
    }, [intl, theme, playbookRunName, checklist.title, handleRename]);

    const handleAddItem = useCallback(async (title: string) => {
        const res = await addChecklistItem(serverUrl, playbookRunId, checklistNumber, title);
        if ('error' in res && res.error) {
            showPlaybookErrorSnackbar();
            logError('error on addChecklistItem', getFullErrorMessage(res.error));
        }
    }, [serverUrl, playbookRunId, checklistNumber]);

    const handleAddPress = useCallback(() => {
        goToAddChecklistItem(intl, theme, playbookRunName, handleAddItem);
    }, [intl, theme, playbookRunName, handleAddItem]);

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

    const titleTextStyle = useMemo(() => {
        return [
            styles.checklistTitle,
            skipped && styles.skippedText,
        ];
    }, [styles.checklistTitle, styles.skippedText, skipped]);

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
                    <View style={styles.titleContainer}>
                        <Text
                            style={titleTextStyle}
                            numberOfLines={1}
                        >
                            {checklist.title}
                        </Text>
                    </View>
                    <View style={styles.progressAndEditContainer}>
                        <Text style={styles.progressText}>{`${completed} / ${totalNumber} done`}</Text>
                        <TouchableOpacity onPress={handleEditPress}>
                            <CompassIcon
                                name='pencil-outline'
                                style={styles.editIcon}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
                <ProgressBar
                    progress={progress}
                    isActive={!isFinished}
                />
            </TouchableOpacity>
            <Animated.View
                style={[styles.checklistItemsContainer, animatedStyle]}
                testID='checklist-items-container'
            >
                {items.map((item, index) => (
                    <ChecklistItem
                        key={item.id}
                        item={item}
                        channelId={channelId}
                        checklistNumber={checklistNumber}
                        itemNumber={index}
                        playbookRunId={playbookRunId}
                        isDisabled={isFinished || !isParticipant}
                    />
                ))}
                {!isFinished && isParticipant && (
                    <Button
                        text={intl.formatMessage({id: 'playbooks.checklist_item.add.button', defaultMessage: 'New'})}
                        iconName='plus'
                        onPress={handleAddPress}
                        theme={theme}
                        size='m'
                        emphasis='tertiary'
                        testID='add-checklist-item-button'
                    />
                )}
            </Animated.View>
            {/* This is a hack to get the height of the checklist items */}
            <View
                style={calculatorStyle}
                onLayout={calculatorOnLayout}
            >
                {items.map((item, index) => (
                    <ChecklistItem
                        key={item.id}
                        item={item}
                        channelId={channelId}
                        checklistNumber={checklistNumber}
                        itemNumber={index}
                        playbookRunId={playbookRunId}
                        isDisabled={isFinished || !isParticipant}
                    />
                ))}
                {!isFinished && isParticipant && (
                    <View style={styles.addButton}>
                        <CompassIcon
                            name='plus'
                            style={styles.addButtonIcon}
                        />
                        <Text style={styles.addButtonText}>
                            {intl.formatMessage({id: 'playbooks.checklist_item.add.button', defaultMessage: 'New'})}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

export default Checklist;
