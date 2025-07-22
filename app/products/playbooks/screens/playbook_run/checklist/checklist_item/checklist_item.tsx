// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, ActivityIndicator} from 'react-native';

import BaseChip from '@components/chips/base_chip';
import UserChip from '@components/chips/user_chip';
import CompassIcon from '@components/compass_icon';
import {getFriendlyDate} from '@components/friendly_date';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {runChecklistItem, updateChecklistItem} from '@playbooks/actions/remote/checklist';
import {isDueSoon, isOverdue} from '@playbooks/utils/run';
import {openUserProfileModal, popTo} from '@screens/navigation';
import {logDebug} from '@utils/log';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import Checkbox from './checkbox';

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type UserModel from '@typings/database/models/servers/user';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    checklistItem: {
        flexDirection: 'row',
        gap: 12,
    },
    itemDetails: {
        gap: 8,
        flex: 1,
    },
    itemTitle: {
        ...typography('Body', 200, 'Regular'),
        color: theme.centerChannelColor,
    },
    itemDescription: {
        ...typography('Body', 100, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.72),
    },
    chipsRow: {
        flexDirection: 'row',
        gap: 4,
        flexWrap: 'wrap',
    },
    chipIcon: {
        color: changeOpacity(theme.centerChannelColor, 0.48),
        marginLeft: 8,
    },
    overdueChipIcon: {
        fontWeight: 600,
    },
    dueSoonChipIcon: {
        color: theme.dndIndicator,
    },
    itemDetailsTexts: {
        gap: 4,
    },
    checkboxContainer: {
        marginVertical: 2,
    },
    skippedText: {
        textDecorationLine: 'line-through',
    },
}));

type Props = {
    item: PlaybookChecklistItemModel | PlaybookChecklistItem;
    assignee?: UserModel;
    teammateNameDisplay: string;
    channelId: string;
    checklistNumber: number;
    itemNumber: number;
    playbookRunId: string;
    isDisabled: boolean;
}

const ChecklistItem = ({
    item,
    assignee,
    teammateNameDisplay,
    channelId,
    checklistNumber,
    itemNumber,
    playbookRunId,
    isDisabled,
}: Props) => {
    const dueDate = 'dueDate' in item ? item.dueDate : item.due_date;
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const [isChecking, setIsChecking] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);

    const checked = item.state === 'closed';
    const skipped = item.state === 'skipped';
    const overdue = isOverdue(item);
    const dueSoon = isDueSoon(item);

    const onUserChipPress = useCallback((userId: string) => {
        openUserProfileModal(intl, theme, {
            userId,
            channelId,
            location: 'PlaybookRun',
        });
    }, [channelId, intl, theme]);

    const executeCommand = useCallback(async () => {
        if (isExecuting) {
            return;
        }
        setIsExecuting(true);
        const res = await runChecklistItem(serverUrl, playbookRunId, checklistNumber, itemNumber);
        if (res.error) {
            showPlaybookErrorSnackbar();
        } else {
            popTo('Channel');
        }
        setIsExecuting(false);
    }, [checklistNumber, isExecuting, itemNumber, playbookRunId, serverUrl]);

    const toggleChecked = useCallback(async () => {
        if (isChecking) {
            return;
        }
        setIsChecking(true);
        const res = await updateChecklistItem(serverUrl, playbookRunId, item.id, checklistNumber, itemNumber, checked ? '' : 'closed');
        if (res.error) {
            showPlaybookErrorSnackbar();
            logDebug('updateChecklistItem error', res.error);
        }
        setIsChecking(false);
    }, [isChecking, serverUrl, playbookRunId, item.id, checklistNumber, itemNumber, checked]);

    const chipIconStyle = useMemo(() => {
        return [
            styles.chipIcon,
            dueSoon && styles.dueSoonChipIcon,
        ];
    }, [dueSoon, styles.chipIcon, styles.dueSoonChipIcon]);

    const checkbox = isChecking ? (
        <ActivityIndicator
            size='small'
            color={theme.centerChannelColor}
            testID='checklist-item-loading'
        />
    ) : (
        <Checkbox
            checked={checked}
            onPress={toggleChecked}
            disabled={isDisabled || skipped}
        />
    );

    let commandMessage = '';
    if (item.command) {
        const commandLastRun = 'commandLastRun' in item ? item.commandLastRun : item.command_last_run;
        const commandName = item.command.substring(1);
        if (commandLastRun) {
            commandMessage = intl.formatMessage({
                id: 'playbook_run.checklist.rerunCommand',
                defaultMessage: '{command} (Rerun)',
            }, {command: commandName});
        } else {
            commandMessage = commandName;
        }
    }

    return (
        <View style={styles.checklistItem}>
            <View style={styles.checkboxContainer}>
                {checkbox}
            </View>
            <View style={styles.itemDetails}>
                <View style={styles.itemDetailsTexts}>
                    <Text style={[styles.itemTitle, skipped && styles.skippedText]}>{item.title}</Text>
                    {item.description && (
                        <Text style={[styles.itemDescription, skipped && styles.skippedText]}>{item.description}</Text>
                    )}
                </View>

                {(assignee || dueDate || (item.command)) && (
                    <View style={styles.chipsRow}>
                        {assignee && (
                            <UserChip
                                user={assignee}
                                onPress={onUserChipPress}
                                teammateNameDisplay={teammateNameDisplay}
                            />
                        )}

                        {Boolean(dueDate) && (
                            <BaseChip
                                label={intl.formatMessage({id: 'playbook_run.checklist.dueIn', defaultMessage: 'Due {dueDate}'}, {dueDate: getFriendlyDate(intl, dueDate)})}
                                prefix={
                                    <CompassIcon
                                        name='calendar-outline'
                                        style={chipIconStyle}
                                        size={14}
                                    />
                                }
                                type={dueSoon ? 'danger' : 'normal'}
                                boldText={overdue}
                            />
                        )}

                        {item.command && (
                            <BaseChip
                                label={commandMessage}
                                onPress={executeCommand}
                                type='link'
                                prefix={
                                    isExecuting ? (
                                        <ActivityIndicator
                                            size='small'
                                            color={theme.centerChannelColor}
                                        />
                                    ) : (
                                        <CompassIcon
                                            name='slash-forward'
                                            style={styles.chipIcon}
                                        />
                                    )
                                }
                            />
                        )}
                    </View>
                )}
            </View>
        </View>
    );
};

export default ChecklistItem;
