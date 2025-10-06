// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {View, Text, ScrollView, Alert} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@components/button';
import UserChip from '@components/chips/user_chip';
import Markdown from '@components/markdown';
import Tag from '@components/tag';
import UserAvatarsStack from '@components/user_avatars_stack';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {finishRun, setOwner} from '@playbooks/actions/remote/runs';
import {getRunScheduledTimestamp, isRunFinished} from '@playbooks/utils/run';
import {openUserProfileModal, popTopScreen} from '@screens/navigation';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import {goToSelectUser} from '../navigation';

import ChecklistList from './checklist_list';
import ErrorState from './error_state';
import OutOfDateHeader from './out_of_date_header';
import StatusUpdateIndicator from './status_update_indicator';

import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

const messages = defineMessages({
    owner: {
        id: 'playbooks.playbook_run.owner',
        defaultMessage: 'Owner',
    },
    participants: {
        id: 'playbooks.playbook_run.participants',
        defaultMessage: 'Participants',
    },
    tasks: {
        id: 'playbooks.playbook_run.tasks',
        defaultMessage: 'Tasks',
    },
    statusUpdateDue: {
        id: 'playbooks.playbook_run.status_update_due',
        defaultMessage: 'Status update due in {time}',
    },
    participantsTitle: {
        id: 'playbooks.playbook_run.participants_title',
        defaultMessage: 'Run Participants',
    },
    runDetails: {
        id: 'playbooks.playbook_run.run_details',
        defaultMessage: 'Run details',
    },
    overdue: {
        id: 'playbooks.playbook_run.overdue',
        defaultMessage: '{num} {num, plural, =1 {task} other {tasks}} overdue',
    },
    finished: {
        id: 'playbooks.playbook_run.finished',
        defaultMessage: 'Finished',
    },
    finishRunDialogTitle: {
        id: 'playbooks.playbook_run.finish_run_dialog_title',
        defaultMessage: 'Finish Run',
    },
    finishRunDialogDescription: {
        id: 'playbooks.playbook_run.finish_run_dialog_description',
        defaultMessage: 'There are {pendingCount} {pendingCount, plural, =1 {task} other {tasks}} pending.\n\nAre you sure you want to finish the run for all participants?',
    },
    finishRunDialogCancel: {
        id: 'playbooks.playbook_run.finish_run_dialog_cancel',
        defaultMessage: 'Cancel',
    },
    finishRunDialogFinish: {
        id: 'playbooks.playbook_run.finish_run_dialog_finish',
        defaultMessage: 'Finish',
    },
    finishRunButton: {
        id: 'playbooks.playbook_run.finish_run_button',
        defaultMessage: 'Finish Run',
    },
});

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
    },
    intro: {
        gap: 32,
    },
    titleAndDescription: {
        gap: 10,
        alignItems: 'flex-start',
    },
    title: {
        ...typography('Heading', 400, 'SemiBold'),
        color: theme.centerChannelColor,
    },
    infoText: {
        ...typography('Body', 100, 'Regular'),
        color: theme.centerChannelColor,
    },
    peopleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    peopleRowCol: {
        flex: 1,
        gap: 6,
    },
    peopleRowColHeader: {
        ...typography('Heading', 100, 'SemiBold'),
        color: changeOpacity(theme.centerChannelColor, 0.72),
    },
    ownerRow: {
        alignItems: 'flex-start',
    },
    tasksContainer: {
        gap: 12,
    },
    tasksHeaderContainer: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    tasksHeader: {
        ...typography('Heading', 200, 'SemiBold'),
        color: theme.centerChannelColor,
    },
    scrollView: {
        paddingHorizontal: 20,
        paddingVertical: 32,
        gap: 16,
    },
    markdownContainer: {
        width: '100%',
    },
}));

type Props = {
    playbookRun?: PlaybookRunModel | PlaybookRun;
    owner?: UserModel;
    participants: UserModel[];
    componentId: AvailableScreens;
    checklists: Array<PlaybookChecklistModel | PlaybookChecklist>;
    overdueCount: number;
    pendingCount: number;
    currentUserId: string;
    teammateNameDisplay: string;
}

export default function PlaybookRun({
    playbookRun,
    owner,
    participants,
    checklists,
    overdueCount,
    pendingCount,
    componentId,
    currentUserId,
    teammateNameDisplay,
}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const insets = useSafeAreaInsets();
    const lastSyncAt = playbookRun && 'lastSyncAt' in playbookRun ? playbookRun.lastSyncAt : 0;

    const channelId = playbookRun && 'channelId' in playbookRun ? playbookRun.channelId : (playbookRun?.channel_id || '');

    useAndroidHardwareBackHandler(componentId, () => {
        popTopScreen();
        return true;
    });

    const isParticipant = participants.some((p) => p.id === currentUserId) || owner?.id === currentUserId;

    const isFinished = isRunFinished(playbookRun);
    const readOnly = isFinished || !isParticipant;

    const containerStyle = useMemo(() => {
        return [
            styles.container,
            {paddingBottom: insets.bottom},
        ];
    }, [insets.bottom, styles.container]);

    const openOwnerProfile = useCallback(() => {
        if (!owner) {
            return;
        }

        openUserProfileModal(intl, theme, {
            userId: owner.id,
            channelId,
            location: componentId,
        });
    }, [owner, intl, theme, channelId, componentId]);

    const handleSelectOwner = useCallback(async (selected: UserProfile) => {
        if (!playbookRun) {
            return;
        }

        const res = await setOwner(serverUrl, playbookRun.id, selected.id);
        if (res.error) {
            showPlaybookErrorSnackbar();
        }
    }, [playbookRun, serverUrl]);

    const openChangeOwnerModal = useCallback(() => {
        if (!owner) {
            return;
        }

        goToSelectUser(
            theme,
            playbookRun?.name || '',
            intl.formatMessage(messages.owner),
            [...participants.map((p) => p.id), owner?.id || ''],
            owner?.id,
            handleSelectOwner,
        );
    }, [handleSelectOwner, intl, owner, participants, playbookRun?.name, theme]);

    const handleFinishRun = useCallback(() => {
        if (!playbookRun) {
            return;
        }

        Alert.alert(
            intl.formatMessage(messages.finishRunDialogTitle),
            intl.formatMessage(messages.finishRunDialogDescription, {pendingCount}),
            [
                {
                    text: intl.formatMessage(messages.finishRunDialogCancel),
                    style: 'cancel',
                },
                {
                    text: intl.formatMessage(messages.finishRunDialogFinish),
                    onPress: async () => {
                        const res = await finishRun(serverUrl, playbookRun.id);
                        if (res.error) {
                            showPlaybookErrorSnackbar();
                        }
                    },
                    style: 'destructive',
                },
            ],
        );
    }, [intl, pendingCount, playbookRun, serverUrl]);

    const ownerAction = useMemo(() => {
        if (readOnly) {
            return undefined;
        }
        return {icon: 'downArrow' as const, onPress: openChangeOwnerModal};
    }, [openChangeOwnerModal, readOnly]);

    if (!playbookRun) {
        return <ErrorState/>;
    }

    return (
        <>
            <OutOfDateHeader
                serverUrl={serverUrl}
                lastSyncAt={lastSyncAt}
            />
            <View style={containerStyle}>
                <ScrollView contentContainerStyle={styles.scrollView}>
                    <View style={styles.intro}>
                        <View style={styles.titleAndDescription}>
                            <Text style={styles.title}>{playbookRun.name}</Text>
                            {isFinished && (
                                <Tag
                                    message={messages.finished}
                                    type='general'
                                    size='m'
                                />
                            )}
                            <View style={styles.markdownContainer}>
                                <Markdown
                                    value={playbookRun.summary}
                                    theme={theme}
                                    location={componentId}
                                    baseTextStyle={styles.infoText}
                                    blockStyles={getMarkdownBlockStyles(theme)}
                                    textStyles={getMarkdownTextStyles(theme)}
                                />
                            </View>
                        </View>
                        {(owner || participants.length > 0) && (
                            <View
                                style={styles.peopleRow}
                                testID={'people-row'}
                            >
                                {owner && (
                                    <View style={styles.peopleRowCol}>
                                        <Text style={styles.peopleRowColHeader}>
                                            {intl.formatMessage(messages.owner)}
                                        </Text>
                                        <View style={styles.ownerRow}>
                                            <UserChip
                                                user={owner}
                                                onPress={readOnly ? openOwnerProfile : openChangeOwnerModal}
                                                teammateNameDisplay={teammateNameDisplay}
                                                action={ownerAction}
                                            />
                                        </View>
                                    </View>
                                )}
                                {participants.length > 0 && (
                                    <View style={styles.peopleRowCol}>
                                        <Text style={styles.peopleRowColHeader}>
                                            {intl.formatMessage(messages.participants)}
                                        </Text>
                                        <UserAvatarsStack
                                            users={participants}
                                            location={componentId}
                                            bottomSheetTitle={messages.participantsTitle}
                                        />
                                    </View>
                                )}
                            </View>
                        )}
                        <StatusUpdateIndicator
                            isFinished={isFinished}
                            timestamp={getRunScheduledTimestamp(playbookRun)}
                        />
                    </View>
                    <View style={styles.tasksContainer}>
                        <View style={styles.tasksHeaderContainer}>
                            <Text style={styles.tasksHeader}>
                                {intl.formatMessage(messages.tasks)}
                            </Text>
                            {Boolean(overdueCount) && (
                                <Tag
                                    message={intl.formatMessage(messages.overdue, {num: overdueCount})}
                                    type='danger'
                                />
                            )}
                        </View>
                        <ChecklistList
                            checklists={checklists}
                            channelId={channelId}
                            playbookRunId={playbookRun.id}
                            isFinished={isRunFinished(playbookRun)}
                            isParticipant={isParticipant}
                        />
                    </View>
                    {!readOnly && (
                        <Button
                            text={intl.formatMessage(messages.finishRunButton)}
                            onPress={handleFinishRun}
                            theme={theme}
                            size='lg'
                            emphasis='tertiary'
                        />
                    )}
                </ScrollView>
            </View>
        </>
    );
}

PlaybookRun.displayName = 'PlaybookRun';
