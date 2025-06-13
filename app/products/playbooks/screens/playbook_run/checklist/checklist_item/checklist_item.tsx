// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View, Text} from 'react-native';

import BaseChip from '@components/chips/base_chip';
import UserChip from '@components/chips/user_chip';
import CompassIcon from '@components/compass_icon';
import {getFriendlyDate} from '@components/friendly_date';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {updateChecklistItem} from '@playbooks/actions/remote/checklist';
import {openUserProfileModal} from '@screens/navigation';
import {logDebug} from '@utils/log';
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
        ...typography('Body', 200, 'SemiBold'),
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
        fontSize: 12,
        color: theme.centerChannelColor,
        marginRight: 4,
    },
    itemDetailsTexts: {
        gap: 4,
    },
    checkboxContainer: {
        marginVertical: 2,
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
    isFinished: boolean;
}

const ChecklistItem = ({
    item,
    assignee,
    teammateNameDisplay,
    channelId,
    checklistNumber,
    itemNumber,
    playbookRunId,
    isFinished,
}: Props) => {
    const dueDate = 'dueDate' in item ? item.dueDate : item.due_date;
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const checked = item.state === 'closed';

    const onUserChipPress = useCallback((userId: string) => {
        openUserProfileModal(intl, theme, {
            userId,
            channelId,
            location: 'PlabyookRun',
        });
    }, [channelId, intl, theme]);

    const executeCommand = useCallback(() => {
        logDebug('executeCommand', item.command);
    }, [item.command]);

    const toggleChecked = useCallback(() => {
        updateChecklistItem(serverUrl, playbookRunId, item.id, checklistNumber, itemNumber, checked ? '' : 'closed');
    }, [serverUrl, playbookRunId, checklistNumber, itemNumber, checked, item.id]);

    return (
        <View style={styles.checklistItem}>
            <View style={styles.checkboxContainer}>
                <Checkbox
                    checked={checked}
                    onPress={toggleChecked}
                    disabled={isFinished}
                />
            </View>
            <View style={styles.itemDetails}>
                <View style={styles.itemDetailsTexts}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.description && (
                        <Text style={styles.itemDescription}>{item.description}</Text>
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
                                        name='clock-outline'
                                        style={styles.chipIcon}
                                    />
                                }
                            />
                        )}

                        {item.command && (
                            <BaseChip
                                label={item.command.substring(1)}
                                onPress={executeCommand}
                                prefix={
                                    <CompassIcon
                                        name='slash-forward'
                                        style={styles.chipIcon}
                                    />
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
