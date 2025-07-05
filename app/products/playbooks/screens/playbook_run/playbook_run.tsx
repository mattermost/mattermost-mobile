// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {View, Text, ScrollView} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import UserChip from '@components/chips/user_chip';
import Markdown from '@components/markdown';
import Tag from '@components/tag';
import UserAvatarsStack from '@components/user_avatars_stack';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {getRunScheduledTimestamp, isRunFinished} from '@playbooks/utils/run';
import {openUserProfileModal, popTopScreen} from '@screens/navigation';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

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
});

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
    },
    intro: {
        gap: 32,
        marginVertical: 24,
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
    },
}));

type Props = {
    playbookRun?: PlaybookRunModel | PlaybookRun;
    owner?: UserModel;
    participants: UserModel[];
    componentId: AvailableScreens;
    checklists: Array<PlaybookChecklistModel | PlaybookChecklist>;
    overdueCount: number;
    currentUserId: string;
    teammateNameDisplay: string;
}

export default function PlaybookRun({
    playbookRun,
    owner,
    participants,
    checklists,
    overdueCount,
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

    if (!playbookRun) {
        return <ErrorState/>;
    }

    const isFinished = isRunFinished(playbookRun);

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
                            <Markdown
                                value={playbookRun.summary}
                                theme={theme}
                                location={componentId}
                                baseTextStyle={styles.infoText}
                                blockStyles={getMarkdownBlockStyles(theme)}
                                textStyles={getMarkdownTextStyles(theme)}
                            />
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
                                                onPress={openOwnerProfile}
                                                teammateNameDisplay={teammateNameDisplay}
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
                </ScrollView>
            </View>
        </>
    );
}

PlaybookRun.displayName = 'PlaybookRun';
