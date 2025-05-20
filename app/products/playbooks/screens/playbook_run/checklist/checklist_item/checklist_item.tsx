// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View, Text} from 'react-native';

import BaseChip from '@components/chips/base_chip';
import UserChip from '@components/chips/user_chip';
import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
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

const noop = () => {/* do nothing */};

type Props = {
    item: PlaybookChecklistItemModel;
    assignee?: UserModel;
    teammateNameDisplay: string;
}

const ChecklistItem = ({
    item,
    assignee,
    teammateNameDisplay,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const checked = item.state === 'done';

    const dueIn = item.dueDate ? item.dueDate - Date.now() : null;

    const executeCommand = () => {
        logDebug('executeCommand', item.command);
    };

    const toggleChecked = useCallback(() => {
        // Connect with API
    }, []);

    return (
        <View style={styles.checklistItem}>
            <View style={styles.checkboxContainer}>
                <Checkbox
                    checked={checked}
                    onPress={toggleChecked}
                />
            </View>
            <View style={styles.itemDetails}>
                <View style={styles.itemDetailsTexts}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.description && (
                        <Text style={styles.itemDescription}>{item.description}</Text>
                    )}
                </View>

                {(assignee || item.dueDate || (item.command)) && (
                    <View style={styles.chipsRow}>
                        {assignee && (
                            <UserChip
                                user={assignee}
                                onPress={noop}
                                teammateNameDisplay={teammateNameDisplay}
                            />
                        )}

                        {item.dueDate && (
                            <BaseChip
                                label={`Due in ${dueIn}`}
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
                                label={item.command}
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
