// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {joinIfNeededAndSwitchToChannel} from '@actions/remote/channel';
import {Screens} from '@constants';
import {getThemeFromState, goToScreen} from '@screens/navigation';
import {errorBadChannel} from '@utils/draft';
import {logDebug} from '@utils/log';
import {changeOpacity} from '@utils/theme';

import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type {IntlShape} from 'react-intl';
import type {Options as RNNOptions} from 'react-native-navigation';

export function goToPlaybookRuns(intl: IntlShape, channelId: string, channelName: string) {
    const theme = getThemeFromState();
    const title = intl.formatMessage({id: 'playbooks.playbooks_runs.title', defaultMessage: 'Playbook checklists'});
    goToScreen(Screens.PLAYBOOKS_RUNS, title, {channelId}, {
        topBar: {
            subtitle: {
                text: channelName,
                color: changeOpacity(theme.sidebarText, 0.72),
            },
        },
    });
}

export function goToParticipantPlaybooks(intl: IntlShape) {
    const title = intl.formatMessage({id: 'playbooks.participant_playbooks.title', defaultMessage: 'Playbook checklists'});
    goToScreen(Screens.PARTICIPANT_PLAYBOOKS, title, {}, {});
}

export async function goToPlaybookRun(intl: IntlShape, playbookRunId: string, playbookRun?: PlaybookRun) {
    const title = intl.formatMessage({id: 'playbooks.playbook_run.title', defaultMessage: 'Playbook checklist'});
    goToScreen(Screens.PLAYBOOK_RUN, title, {playbookRunId, playbookRun}, {});
}

export async function goToPlaybookRunWithChannelSwitch(intl: IntlShape, serverUrl: string, playbookRun: PlaybookRun | PlaybookRunModel) {
    const channelId = 'channelId' in playbookRun ? playbookRun.channelId : playbookRun.channel_id;
    const teamId = 'teamId' in playbookRun ? playbookRun.teamId : playbookRun.team_id;

    // First switch to the channel
    const result = await joinIfNeededAndSwitchToChannel(serverUrl, {id: channelId}, {id: teamId}, errorBadChannel, intl);
    if (result.error) {
        logDebug('Failed to switch to channel', result.error);
        return;
    }

    // Then navigate to the playbook run
    const title = intl.formatMessage({id: 'playbooks.playbook_run.title', defaultMessage: 'Playbook checklist'});
    goToScreen(Screens.PLAYBOOK_RUN, title, {playbookRunId: playbookRun.id}, {});
}

export async function goToPostUpdate(intl: IntlShape, playbookRunId: string) {
    const title = intl.formatMessage({id: 'playbooks.post_update.title', defaultMessage: 'Post update'});
    goToScreen(Screens.PLAYBOOK_POST_UPDATE, title, {playbookRunId}, {});
}

function getSubtitleOptions(theme: Theme, runName: string): RNNOptions {
    return {
        topBar: {
            subtitle: {
                color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
                text: runName,
            },
        },
    };
}

export async function goToEditCommand(
    intl: IntlShape,
    theme: Theme,
    runName: string,
    command: string | null,
    channelId: string,
    updateCommand: (command: string) => void,
) {
    const title = intl.formatMessage({id: 'playbooks.edit_command.title', defaultMessage: 'Slash command'});
    const options = getSubtitleOptions(theme, runName);
    goToScreen(Screens.PLAYBOOK_EDIT_COMMAND, title, {
        savedCommand: command,
        updateCommand,
        channelId,
    }, options);
}

export async function goToRenameChecklist(
    intl: IntlShape,
    theme: Theme,
    runName: string,
    currentTitle: string,
    onSave: (newTitle: string) => void,
) {
    const title = intl.formatMessage({id: 'playbooks.checklist.rename.title', defaultMessage: 'Rename checklist'});
    const options = getSubtitleOptions(theme, runName);
    goToScreen(Screens.PLAYBOOK_RENAME_CHECKLIST, title, {
        currentTitle,
        onSave,
    }, options);
}

export async function goToAddChecklistItem(
    intl: IntlShape,
    theme: Theme,
    runName: string,
    onSave: (title: string) => void,
) {
    const title = intl.formatMessage({id: 'playbooks.checklist_item.add.title', defaultMessage: 'New Task'});
    const options = getSubtitleOptions(theme, runName);
    goToScreen(Screens.PLAYBOOK_ADD_CHECKLIST_ITEM, title, {
        onSave,
    }, options);
}

export async function goToRenamePlaybookRun(
    intl: IntlShape,
    theme: Theme,
    currentTitle: string,
    onSave: (newTitle: string) => void,
) {
    const title = intl.formatMessage({id: 'playbooks.playbook_run.rename.title', defaultMessage: 'Rename playbook run'});
    goToScreen(Screens.PLAYBOOK_RENAME_RUN, title, {
        currentTitle,
        onSave,
    });
}

export async function goToSelectUser(
    theme: Theme,
    runName: string,
    title: string,
    participantIds: string[],
    selected: string | undefined,
    handleSelect: (user: UserProfile) => void,
    handleRemove?: () => void,
) {
    const options = getSubtitleOptions(theme, runName);
    goToScreen(Screens.PLAYBOOK_SELECT_USER, title, {
        participantIds,
        selected,
        handleSelect,
        handleRemove,
    }, options);
}

export async function goToSelectDate(
    intl: IntlShape,
    theme: Theme,
    runName: string,
    onSave: (date: number | undefined) => void,
    selectedDate: number | undefined,
) {
    const options = getSubtitleOptions(theme, runName);
    const title = intl.formatMessage({id: 'playbooks.select_date.title', defaultMessage: 'Due date'});
    goToScreen(Screens.PLAYBOOKS_SELECT_DATE, title, {
        onSave,
        selectedDate,
    }, options);
}

export async function goToSelectPlaybook(
    intl: IntlShape,
    theme: Theme,
) {
    const title = intl.formatMessage({id: 'playbooks.select_playbook.title', defaultMessage: 'New'});
    goToScreen(Screens.PLAYBOOKS_SELECT_PLAYBOOK, title, {}, {
        topBar: {
            subtitle: {
                text: intl.formatMessage({id: 'playbooks.select_playbook.subtitle', defaultMessage: 'Select a playbook'}),
                color: changeOpacity(theme.sidebarText, 0.72),
            },
        },
    });
}

export async function goToStartARun(intl: IntlShape, theme: Theme, playbook: Playbook, onRunCreated: (run: PlaybookRun) => void) {
    const title = intl.formatMessage({id: 'playbooks.start_a_run.title', defaultMessage: 'New'});
    const subtitle = playbook.title;
    goToScreen(Screens.PLAYBOOKS_START_A_RUN, title, {playbook, onRunCreated}, {
        topBar: {
            subtitle: {
                text: subtitle,
                color: changeOpacity(theme.sidebarText, 0.72),
            },
        },
    });
}
