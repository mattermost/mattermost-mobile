// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {View, Text, ScrollView} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import UserChip from '@components/chips/user_chip';
import Markdown from '@components/markdown';
import UserAvatarsStack from '@components/user_avatars_stack';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {popTopScreen} from '@screens/navigation';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import ChecklistList from './checklist_list';
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
});

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
        marginHorizontal: 20,
    },
    intro: {
        gap: 32,
        marginVertical: 24,
    },
    titleAndDescription: {
        gap: 10,
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
    tasksHeader: {
        ...typography('Heading', 200, 'SemiBold'),
        color: theme.centerChannelColor,
    },
}));

const noop = () => {/* do nothing */};

type Props = {
    playbookRun: PlaybookRunModel;
    owner?: UserModel;
    participants: UserModel[];
    componentId: AvailableScreens;
    checklists: PlaybookChecklistModel[];
}

export default function PlaybookRun({
    playbookRun,
    owner,
    participants,
    checklists,
    componentId,
}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const insets = useSafeAreaInsets();

    useAndroidHardwareBackHandler(componentId, () => {
        popTopScreen();
        return true;
    });

    const containerStyle = useMemo(() => {
        return [
            styles.container,
            {paddingBottom: insets.bottom},
        ];
    }, [insets.bottom, styles.container]);

    return (
        <View style={containerStyle}>
            <ScrollView>
                <View style={styles.intro}>
                    <View style={styles.titleAndDescription}>
                        <Text style={styles.title}>{playbookRun.name}</Text>
                        <Markdown
                            value={playbookRun.description}
                            theme={theme}
                            location={componentId}
                            baseTextStyle={styles.infoText}
                            blockStyles={getMarkdownBlockStyles(theme)}
                            textStyles={getMarkdownTextStyles(theme)}
                        />
                    </View>
                    {(owner || participants.length > 0) && (
                        <View style={styles.peopleRow}>
                            {owner && (
                                <View style={styles.peopleRowCol}>
                                    <Text style={styles.peopleRowColHeader}>
                                        {intl.formatMessage(messages.owner)}
                                    </Text>
                                    <View style={styles.ownerRow}>
                                        <UserChip
                                            user={owner}
                                            onPress={noop}
                                            teammateNameDisplay='username'
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
                        lastStatusUpdateAt={playbookRun.lastStatusUpdateAt}
                    />
                </View>
                <View style={styles.tasksContainer}>
                    <Text style={styles.tasksHeader}>
                        {intl.formatMessage(messages.tasks)}
                    </Text>
                    <ChecklistList checklists={checklists}/>
                </View>
            </ScrollView>
        </View>
    );
}

PlaybookRun.displayName = 'PlaybookRun';
