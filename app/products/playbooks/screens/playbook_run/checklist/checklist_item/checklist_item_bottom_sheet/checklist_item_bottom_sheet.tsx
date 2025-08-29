// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, type ComponentProps} from 'react';
import {defineMessages, useIntl, type IntlShape} from 'react-intl';
import {View, Text} from 'react-native';

import MenuDivider from '@components/menu_divider';
import OptionBox from '@components/option_box';
import OptionItem, {ITEM_HEIGHT} from '@components/option_item';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {setChecklistItemCommand} from '@playbooks/actions/remote/checklist';
import {dismissBottomSheet, goToScreen, openUserProfileModal} from '@screens/navigation';
import {toMilliseconds} from '@utils/datetime';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import Checkbox from '../checkbox';

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type UserModel from '@typings/database/models/servers/user';

const messages = defineMessages({
    check: {
        id: 'playbooks.checklist_item.check',
        defaultMessage: 'Check',
    },
    checked: {
        id: 'playbooks.checklist_item.checked',
        defaultMessage: 'Checked',
    },
    skip: {
        id: 'playbooks.checklist_item.skip',
        defaultMessage: 'Skip',
    },
    skipped: {
        id: 'playbooks.checklist_item.skipped',
        defaultMessage: 'Skipped',
    },
    runCommand: {
        id: 'playbooks.checklist_item.run_command',
        defaultMessage: 'Run command',
    },
    rerunCommand: {
        id: 'playbooks.checklist_item.rerun_command',
        defaultMessage: 'Rerun command',
    },
    assignee: {
        id: 'playbooks.checklist_item.assignee',
        defaultMessage: 'Assignee',
    },
    dueDate: {
        id: 'playbooks.checklist_item.due_date',
        defaultMessage: 'Due date',
    },
    command: {
        id: 'playbooks.checklist_item.command',
        defaultMessage: 'Command',
    },
    none: {
        id: 'playbooks.checklist_item.none',
        defaultMessage: 'None',
    },
    dateAtTime: {
        id: 'playbooks.checklist_item.date_at_time',
        defaultMessage: '{date} at {time}',
    },
});

const ACTION_BUTTON_HEIGHT = 62;
const N_OPTIONS = 3;
const OPTIONS_GAP = 8;
const SCROLL_CONTENT_GAP = 12;
const TITLE_LINE_HEIGHT = 24; // From typography 300
const BODY_LINE_HEIGHT = 24; // From typography 200
const BODY_LINES_COUNT = 3;

export const BOTTOM_SHEET_HEIGHT = {
    base: (N_OPTIONS * ITEM_HEIGHT) + (OPTIONS_GAP * (N_OPTIONS - 1)) + (SCROLL_CONTENT_GAP * 2) + TITLE_LINE_HEIGHT + (BODY_LINE_HEIGHT * BODY_LINES_COUNT),
    actionButtons: ACTION_BUTTON_HEIGHT + SCROLL_CONTENT_GAP,
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
        gap: SCROLL_CONTENT_GAP,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    taskTitle: {
        ...typography('Body', 300, 'Regular'),
        color: theme.centerChannelColor,
    },
    taskDescription: {
        ...typography('Body', 200, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.72),
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
        height: ACTION_BUTTON_HEIGHT,
    },
    taskDetailsContainer: {
        gap: OPTIONS_GAP,
    },
    flex: {
        flex: 1,
    },
}));

type Props = {
    runId: string;
    checklistNumber: number;
    itemNumber: number;
    channelId: string;
    item: PlaybookChecklistItemModel | PlaybookChecklistItem;
    assignee?: UserModel;
    onCheck: () => void;
    onSkip: () => void;
    onRunCommand: () => void;
    teammateNameDisplay: string;
    isDisabled: boolean;
};

function getDueDateInfo(intl: IntlShape, dueDate: number | undefined) {
    if (!dueDate) {
        return intl.formatMessage(messages.none);
    }
    const dateObject = new Date(dueDate);
    const dateString = dateObject.toLocaleDateString(intl.locale, {month: 'long', day: 'numeric', weekday: 'long'});
    if (Math.abs(dueDate - Date.now()) < toMilliseconds({days: 1})) {
        const timeString = dateObject.toLocaleTimeString(intl.locale, {hour: '2-digit', minute: '2-digit'});
        return intl.formatMessage(messages.dateAtTime, {date: dateString, time: timeString});
    }
    return dateString;
}

const ChecklistItemBottomSheet = ({
    runId,
    checklistNumber,
    itemNumber,
    channelId,
    item,
    assignee,
    onCheck,
    onSkip,
    onRunCommand,
    teammateNameDisplay,
    isDisabled,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const dueDate = 'dueDate' in item ? item.dueDate : item.due_date;
    const isChecked = item.state === 'closed';
    const isSkipped = item.state === 'skipped';
    const isCommandRun = Boolean('commandLastRun' in item ? item.commandLastRun : item.command_last_run);

    const handleCheck = useCallback(async () => {
        await dismissBottomSheet();
        onCheck?.();
    }, [onCheck]);

    const handleSkip = useCallback(async () => {
        await dismissBottomSheet();
        onSkip?.();
    }, [onSkip]);

    const handleRunCommand = useCallback(async () => {
        await dismissBottomSheet();
        onRunCommand?.();
    }, [onRunCommand]);

    const renderActionButtons = () => (
        <View style={styles.actionButtonsContainer}>
            <OptionBox
                iconName='check'
                activeText={intl.formatMessage(messages.check)}
                text={intl.formatMessage(messages.check)}
                onPress={handleCheck}
                isActive={isChecked}
                testID='checklist_item.check_button'
            />
            <OptionBox
                iconName='close'
                activeText={intl.formatMessage(messages.skipped)}
                text={intl.formatMessage(messages.skip)}
                onPress={handleSkip}
                isActive={isSkipped}
                testID='checklist_item.skip_button'
            />
            {Boolean(item.command) && (
                <OptionBox
                    iconName='slash-forward'
                    activeText={intl.formatMessage(messages.rerunCommand)}
                    text={intl.formatMessage(messages.runCommand)}
                    onPress={handleRunCommand}
                    isActive={isCommandRun}
                    testID='checklist_item.run_command_button'
                />
            )}
        </View>
    );

    const onUserChipPress = useCallback((userId: string) => {
        openUserProfileModal(intl, theme, {
            userId,
            location: 'PlaybookRun',
        });
    }, [intl, theme]);

    const updateCommand = useCallback(async (command: string) => {
        await setChecklistItemCommand(serverUrl, runId, item.id, checklistNumber, itemNumber, command);
    }, [checklistNumber, item.id, itemNumber, runId, serverUrl]);

    const openEditCommandModal = useCallback(() => {
        goToScreen(
            'PlaybookEditCommand',
            intl.formatMessage({id: 'playbooks.edit_command.title', defaultMessage: 'Slash command'}),
            {
                savedCommand: item.command,
                updateCommand,
                channelId,
            },
        );
    }, [intl, item.command, updateCommand, channelId]);

    const assigneeInfo: ComponentProps<typeof OptionItem>['info'] = useMemo(() => {
        if (!assignee) {
            return intl.formatMessage(messages.none);
        }
        return {
            user: assignee,
            onPress: onUserChipPress,
            teammateNameDisplay,
            location: 'PlaybookRun',
        };
    }, [assignee, intl, onUserChipPress, teammateNameDisplay]);

    const renderTaskDetails = () => (
        <View style={styles.taskDetailsContainer}>
            <OptionItem
                type='none'
                icon='account-multiple-plus-outline'
                label={intl.formatMessage(messages.assignee)}
                info={assigneeInfo}
                testID='checklist_item.assignee'
            />
            <OptionItem
                type='none'
                icon='calendar-outline'
                label={intl.formatMessage(messages.dueDate)}
                info={getDueDateInfo(intl, dueDate)}
                testID='checklist_item.due_date'
            />
            <OptionItem
                type={isDisabled ? 'none' : 'arrow'}
                icon='slash-forward'
                label={intl.formatMessage(messages.command)}
                info={item.command || intl.formatMessage(messages.none)}
                testID='checklist_item.command'
                longInfo={true}
                action={isDisabled ? undefined : openEditCommandModal}
            />
        </View>
    );

    return (
        <View
            style={styles.container}
        >
            <View style={styles.checkboxContainer}>
                <Checkbox
                    checked={isChecked}
                    onPress={handleCheck}
                />
                <View style={styles.flex}>
                    <Text style={styles.taskTitle}>
                        {item.title}
                    </Text>
                    {Boolean(item.description) && (
                        <Text style={styles.taskDescription}>
                            {item.description}
                        </Text>
                    )}
                </View>
            </View>
            <MenuDivider/>
            {!isDisabled && renderActionButtons()}
            {renderTaskDetails()}
        </View>
    );
};

export default ChecklistItemBottomSheet;
