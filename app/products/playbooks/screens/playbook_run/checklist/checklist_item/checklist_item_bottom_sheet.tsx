// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import React, {useCallback, useMemo, type ComponentProps} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {View, Text, ScrollView} from 'react-native';

import MenuDivider from '@components/menu_divider';
import OptionBox from '@components/option_box';
import OptionItem from '@components/option_item';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {dismissBottomSheet, openUserProfileModal} from '@screens/navigation';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import Checkbox from './checkbox';

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
});

const ACTION_BUTTON_HEIGHT = 62;

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    scrollContentContainer: {
        gap: 12,
    },
    container: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    taskTitle: {
        ...typography('Heading', 200, 'Regular'),
        color: theme.centerChannelColor,
    },
    taskDescription: {
        ...typography('Body', 100, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.72),
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
        height: ACTION_BUTTON_HEIGHT,
    },
    taskDetailsContainer: {
        gap: 8,
    },
    flex: {
        flex: 1,
    },
}));

type Props = {
    item: PlaybookChecklistItemModel | PlaybookChecklistItem;
    assignee?: UserModel;
    onCheck: () => void;
    onSkip: () => void;
    onRunCommand: () => void;
    teammateNameDisplay: string;
};

const ChecklistItemBottomSheet = ({
    item,
    assignee,
    onCheck,
    onSkip,
    onRunCommand,
    teammateNameDisplay,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const isTablet = useIsTablet();

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
            <OptionBox
                iconName='slash-forward'
                activeText={intl.formatMessage(messages.rerunCommand)}
                text={intl.formatMessage(messages.runCommand)}
                onPress={handleRunCommand}
                isActive={isCommandRun}
                testID='checklist_item.run_command_button'
            />
        </View>
    );

    const getAssigneeInfo: () => ComponentProps<typeof OptionItem>['info'] = () => {
        if (!assignee) {
            return intl.formatMessage(messages.none);
        }
        return {
            user: assignee,
            onPress: onUserChipPress,
            teammateNameDisplay,
            location: 'PlaybookRun',
        };
    };

    const onUserChipPress = useCallback((userId: string) => {
        openUserProfileModal(intl, theme, {
            userId,
            location: 'PlaybookRun',
        });
    }, [intl, theme]);

    const renderTaskDetails = () => (
        <View style={styles.taskDetailsContainer}>
            <OptionItem
                type='none'
                icon='account-multiple-plus-outline'
                label={intl.formatMessage(messages.assignee)}
                info={getAssigneeInfo()}
                testID='checklist_item.assignee'
            />
            <OptionItem
                type='none'
                icon='calendar-outline'
                label={intl.formatMessage(messages.dueDate)}
                info={dueDate ? new Date(dueDate).toLocaleDateString() : intl.formatMessage(messages.none)}
                testID='checklist_item.due_date'
            />
            <OptionItem
                type='none'
                icon='slash-forward'
                label={intl.formatMessage(messages.command)}
                info={item.command || intl.formatMessage(messages.none)}
                testID='checklist_item.command'
            />
        </View>
    );

    const Scroll = useMemo(() => (isTablet ? ScrollView : BottomSheetScrollView), [isTablet]);

    return (
        <View style={styles.container}>
            <Scroll
                style={styles.flex}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={false}
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
                {renderActionButtons()}
                {renderTaskDetails()}
            </Scroll>
        </View>
    );
};

export default ChecklistItemBottomSheet;
