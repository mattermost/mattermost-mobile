// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Screens} from '@constants';
import {getThemeFromState, goToScreen} from '@screens/navigation';
import {changeOpacity} from '@utils/theme';

import type {IntlShape} from 'react-intl';
import type {Options as RNNOptions} from 'react-native-navigation';

export function goToPlaybookRuns(intl: IntlShape, channelId: string, channelName: string) {
    const theme = getThemeFromState();
    const title = intl.formatMessage({id: 'playbooks.playbooks_runs.title', defaultMessage: 'Playbook runs'});
    goToScreen(Screens.PLAYBOOKS_RUNS, title, {channelId}, {
        topBar: {
            subtitle: {
                text: channelName,
                color: changeOpacity(theme.sidebarText, 0.72),
            },
        },
    });
}

export async function goToPlaybookRun(intl: IntlShape, playbookRunId: string, playbookRun?: PlaybookRun) {
    const title = intl.formatMessage({id: 'playbooks.playbook_run.title', defaultMessage: 'Playbook run'});
    goToScreen(Screens.PLAYBOOK_RUN, title, {playbookRunId, playbookRun}, {});
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
