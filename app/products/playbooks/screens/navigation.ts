// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {joinIfNeededAndSwitchToChannel} from '@actions/remote/channel';
import {Navigation, Screens} from '@constants';
import {navigateToChannelInfoScreen, navigateToScreen} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {NavigationStore} from '@store/navigation_store';
import {errorBadChannel} from '@utils/draft';
import {logDebug} from '@utils/log';

import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type {IntlShape} from 'react-intl';

export function goToPlaybookRuns(channelId: string, channelName: string, inModal = false) {
    if (inModal) {
        navigateToChannelInfoScreen(Screens.PLAYBOOKS_RUNS, {channelId, channelName, inModal});
        return;
    }

    navigateToScreen(Screens.PLAYBOOKS_RUNS, {channelId, channelName});
}

export function goToParticipantPlaybooks(isTablet = false) {
    if (isTablet) {
        DeviceEventEmitter.emit(Navigation.NAVIGATION_HOME, Screens.PARTICIPANT_PLAYBOOKS);
        return;
    }
    navigateToScreen(Screens.PARTICIPANT_PLAYBOOKS);
}

export async function goToPlaybookRun(playbookRunId: string, playbookRun?: PlaybookRun) {
    if (NavigationStore.isModalOpen()) {
        navigateToChannelInfoScreen(Screens.PLAYBOOK_RUN, {playbookRunId, playbookRun});
        return;
    }
    navigateToScreen(Screens.PLAYBOOK_RUN, {playbookRunId, playbookRun});
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
    goToPlaybookRun(playbookRun.id);
}

export async function goToPostUpdate(playbookRunId: string) {
    if (NavigationStore.isModalOpen()) {
        navigateToChannelInfoScreen(Screens.PLAYBOOK_POST_UPDATE, {playbookRunId});
        return;
    }

    navigateToScreen(Screens.PLAYBOOK_POST_UPDATE, {playbookRunId});
}

export async function goToEditCommand(
    runName: string,
    command: string | null,
    channelId: string,
    updateCommand: (command: string) => void,
) {
    const props = {subtitle: runName, channelId, savedCommand: command};
    CallbackStore.setCallback(updateCommand);

    if (NavigationStore.isModalOpen()) {
        navigateToChannelInfoScreen(Screens.PLAYBOOK_EDIT_COMMAND, props);
        return;
    }

    navigateToScreen(Screens.PLAYBOOK_EDIT_COMMAND, props);
}

export async function goToRenameChecklist(
    runName: string,
    currentTitle: string,
    onSave: (newTitle: string) => void,
) {
    CallbackStore.setCallback(onSave);
    const props = {subtitle: runName, currentTitle};

    if (NavigationStore.isModalOpen()) {
        navigateToChannelInfoScreen(Screens.PLAYBOOK_RENAME_CHECKLIST, props);
        return;
    }

    navigateToScreen(Screens.PLAYBOOK_RENAME_CHECKLIST, props);
}

export async function goToAddChecklistItem(
    runName: string,
    onSave: (item: ChecklistItemInput) => void,
) {
    const props = {subtitle: runName};
    CallbackStore.setCallback(onSave);

    if (NavigationStore.isModalOpen()) {
        navigateToChannelInfoScreen(Screens.PLAYBOOK_ADD_CHECKLIST_ITEM, props);
        return;
    }

    navigateToScreen(Screens.PLAYBOOK_ADD_CHECKLIST_ITEM, props);
}

export async function goToEditChecklistItem(
    runName: string,
    currentTitle: string,
    currentDescription: string | undefined,
    onSave: (item: ChecklistItemInput) => void,
) {
    const props = {currentTitle, currentDescription, subtitle: runName};
    CallbackStore.setCallback(onSave);

    if (NavigationStore.isModalOpen()) {
        navigateToChannelInfoScreen(Screens.PLAYBOOK_EDIT_CHECKLIST_ITEM, props);
        return;
    }
    navigateToScreen(Screens.PLAYBOOK_EDIT_CHECKLIST_ITEM, props);
}

export async function goToRenamePlaybookRun(
    currentTitle: string,
    playbookRunId: string,
) {
    const props = {currentTitle, playbookRunId};

    if (NavigationStore.isModalOpen()) {
        navigateToChannelInfoScreen(Screens.PLAYBOOK_RENAME_RUN, props);
        return;
    }

    navigateToScreen(Screens.PLAYBOOK_RENAME_RUN, props);
}

export async function goToSelectUser(
    runName: string,
    title: string,
    participantIds: string[],
    selected: string | undefined,
    handleSelect: (user: UserProfile) => void,
    handleRemove?: () => void,
) {
    CallbackStore.setCallback({
        handleSelect,
        handleRemove,
    });

    const props = {runName, title, participantIds, selected};
    if (NavigationStore.isModalOpen()) {
        navigateToChannelInfoScreen(Screens.PLAYBOOK_SELECT_USER, props);
        return;
    }

    navigateToScreen(Screens.PLAYBOOK_SELECT_USER, props);
}

export async function goToSelectDate(
    runName: string,
    onSave: (date: number | undefined) => void,
    selectedDate: number | undefined,
) {
    const props = {subtitle: runName, selectedDate};
    CallbackStore.setCallback(onSave);

    if (NavigationStore.isModalOpen()) {
        navigateToChannelInfoScreen(Screens.PLAYBOOKS_SELECT_DATE, props);
        return;
    }

    navigateToScreen(Screens.PLAYBOOKS_SELECT_DATE, props);
}

export async function goToSelectPlaybook(
    intl: IntlShape,
    channelId?: string,
) {
    const subtitle = intl.formatMessage({id: 'playbooks.select_playbook.subtitle', defaultMessage: 'Select a playbook'});
    if (NavigationStore.isModalOpen()) {
        navigateToChannelInfoScreen(Screens.PLAYBOOKS_SELECT_PLAYBOOK, {channelId, subtitle});
        return;
    }
    navigateToScreen(Screens.PLAYBOOKS_SELECT_PLAYBOOK, {channelId, subtitle});
}

export async function goToStartARun(playbook: Playbook, onRunCreated: (run: PlaybookRun) => void, channelId?: string) {
    const subtitle = playbook.title;
    const props = {playbook, channelId, subtitle};
    CallbackStore.setCallback(onRunCreated);

    if (NavigationStore.isModalOpen()) {
        navigateToChannelInfoScreen(Screens.PLAYBOOKS_START_A_RUN, props);
        return;
    }

    navigateToScreen(Screens.PLAYBOOKS_START_A_RUN, props);
}

export function goToCreateQuickChecklist(
    channelId: string,
    channelName: string,
    currentUserId: string,
    currentTeamId: string,
) {
    const screen = Screens.PLAYBOOKS_CREATE_QUICK_CHECKLIST;
    const props = {channelId, channelName, currentUserId, currentTeamId};
    navigateToScreen(screen, props);
}
