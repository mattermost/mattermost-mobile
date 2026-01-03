// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {joinIfNeededAndSwitchToChannel} from '@actions/remote/channel';
import {Navigation, Screens} from '@constants';
import {navigateToScreen} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import TestHelper from '@test/test_helper';

import {goToPlaybookRuns, goToPlaybookRun, goToParticipantPlaybooks, goToPlaybookRunWithChannelSwitch, goToEditCommand, goToSelectUser, goToSelectDate, goToPostUpdate, goToSelectPlaybook, goToStartARun, goToRenameChecklist, goToAddChecklistItem, goToCreateQuickChecklist, goToRenamePlaybookRun} from './navigation';

jest.mock('@screens/navigation', () => ({
    navigateToScreen: jest.fn(),
}));

jest.mock('@actions/remote/channel', () => ({
    joinIfNeededAndSwitchToChannel: jest.fn(),
}));

jest.mock('@store/callback_store');

describe('Playbooks Navigation', () => {
    const mockIntl = TestHelper.fakeIntl();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('goToPlaybookRuns', () => {
        it('should navigate to playbook runs screen with correct parameters', () => {
            const channelId = 'channel-id-1';
            const channelName = 'channel-name-1';
            goToPlaybookRuns(channelId, channelName);

            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOKS_RUNS,
                {channelId, channelName},
            );
        });
    });

    describe('goToPlaybookRun', () => {
        it('should navigate to single playbook run screen with correct parameters', async () => {
            const playbookRunId = 'playbook-run-id-1';

            await goToPlaybookRun(playbookRunId);

            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_RUN,
                {playbookRunId},
            );
        });

        it('should navigate to single playbook run screen with playbookRun parameter', async () => {
            const playbookRunId = 'playbook-run-id-1';
            const playbookRun = TestHelper.fakePlaybookRun({
                id: playbookRunId,
            });

            await goToPlaybookRun(playbookRunId, playbookRun);

            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_RUN,
                {playbookRunId, playbookRun},
            );
        });
    });

    describe('goToEditCommand', () => {
        it('should navigate to edit command screen with correct parameters', async () => {
            const command = 'test command';
            const channelId = 'channel-id-1';
            const updateCommand = jest.fn();

            await goToEditCommand('Run 1', command, channelId, updateCommand);

            expect(CallbackStore.setCallback).toHaveBeenCalledWith(updateCommand);
            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_EDIT_COMMAND,
                {
                    savedCommand: command,
                    channelId,
                    subtitle: 'Run 1',
                },
            );
        });

        it('should navigate to edit command screen with null command', async () => {
            const channelId = 'channel-id-1';
            const updateCommand = jest.fn();

            await goToEditCommand('Run 1', null, channelId, updateCommand);

            expect(CallbackStore.setCallback).toHaveBeenCalledWith(updateCommand);
            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_EDIT_COMMAND,
                {
                    savedCommand: null,
                    channelId,
                    subtitle: 'Run 1',
                },
            );
        });
    });

    describe('goToSelectUser', () => {
        it('should navigate to select user screen with correct parameters when handleRemove is provided', async () => {
            const title = 'Select User';
            const participantIds = ['user1', 'user2', 'user3'];
            const selected = 'user2';
            const handleSelect = jest.fn();
            const handleRemove = jest.fn();

            await goToSelectUser('Run 1', title, participantIds, selected, handleSelect, handleRemove);

            expect(CallbackStore.setCallback).toHaveBeenCalledWith({
                handleSelect,
                handleRemove,
            });
            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_SELECT_USER,
                {
                    participantIds,
                    selected,
                    runName: 'Run 1',
                    title,
                },
            );
        });

        it('should navigate to select user screen without handleRemove parameter', async () => {
            const title = 'Select User';
            const participantIds = ['user1', 'user2', 'user3'];
            const selected = 'user2';
            const handleSelect = jest.fn();

            await goToSelectUser('Run 1', title, participantIds, selected, handleSelect);

            expect(CallbackStore.setCallback).toHaveBeenCalledWith({
                handleSelect,
            });
            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_SELECT_USER,
                {
                    participantIds,
                    selected,
                    runName: 'Run 1',
                    title,
                },
            );
        });
    });

    describe('goToSelectDate', () => {
        it('should navigate to select date screen with selected date', async () => {
            const onSave = jest.fn();
            const selectedDate = 1640995200000; // January 1, 2022

            await goToSelectDate('Run 1', onSave, selectedDate);

            expect(CallbackStore.setCallback).toHaveBeenCalledWith(onSave);
            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOKS_SELECT_DATE,
                {
                    selectedDate,
                    subtitle: 'Run 1',
                },
            );
        });

        it('should navigate to select date screen without selected date', async () => {
            const onSave = jest.fn();

            await goToSelectDate('Run 1', onSave, undefined);

            expect(CallbackStore.setCallback).toHaveBeenCalledWith(onSave);
            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOKS_SELECT_DATE,
                {selectedDate: undefined, subtitle: 'Run 1'},
            );
        });
    });

    describe('goToParticipantPlaybooks', () => {
        it('should navigate to participant playbooks screen with correct parameters', () => {
            goToParticipantPlaybooks();

            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PARTICIPANT_PLAYBOOKS,
            );
        });

        it('should navigate to participant playbooks in the home screen for tablets', () => {
            goToParticipantPlaybooks(true);

            expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(
                Navigation.NAVIGATION_HOME, Screens.PARTICIPANT_PLAYBOOKS,
            );
        });
    });

    describe('goToPlaybookRunWithChannelSwitch', () => {
        it('should switch to channel first and then navigate to playbook run', async () => {
            const serverUrl = 'https://test.server.com';
            const mockPlaybookRun = TestHelper.fakePlaybookRun({
                id: 'run-id-1',
                channel_id: 'channel-id-1',
                team_id: 'team-id-1',
            });

            jest.mocked(joinIfNeededAndSwitchToChannel).mockResolvedValue({});

            await goToPlaybookRunWithChannelSwitch(mockIntl, serverUrl, mockPlaybookRun);

            expect(joinIfNeededAndSwitchToChannel).toHaveBeenCalledWith(
                serverUrl,
                {id: mockPlaybookRun.channel_id},
                {id: mockPlaybookRun.team_id},
                expect.any(Function),
                mockIntl,
            );

            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_RUN,
                {playbookRunId: mockPlaybookRun.id},
            );
        });

        it('should handle PlaybookRunModel', async () => {
            const serverUrl = 'https://test.server.com';
            const mockPlaybookRunModel = TestHelper.fakePlaybookRunModel({
                id: 'run-id-1',
                channelId: 'channel-id-1',
                teamId: 'team-id-1',
            });

            jest.mocked(joinIfNeededAndSwitchToChannel).mockResolvedValue({});

            await goToPlaybookRunWithChannelSwitch(mockIntl, serverUrl, mockPlaybookRunModel);

            expect(joinIfNeededAndSwitchToChannel).toHaveBeenCalledWith(
                serverUrl,
                {id: mockPlaybookRunModel.channelId},
                {id: mockPlaybookRunModel.teamId},
                expect.any(Function),
                mockIntl,
            );

            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_RUN,
                {playbookRunId: mockPlaybookRunModel.id},
            );
        });

        it('should not navigate when channel switch fails', async () => {
            const serverUrl = 'https://test.server.com';
            const mockPlaybookRun = TestHelper.fakePlaybookRun({
                id: 'run-id-1',
                channel_id: 'channel-id-1',
                team_id: 'team-id-1',
            });

            jest.mocked(joinIfNeededAndSwitchToChannel).mockResolvedValue({error: 'Channel switch failed'});

            await goToPlaybookRunWithChannelSwitch(mockIntl, serverUrl, mockPlaybookRun);

            expect(joinIfNeededAndSwitchToChannel).toHaveBeenCalledWith(
                serverUrl,
                {id: mockPlaybookRun.channel_id},
                {id: mockPlaybookRun.team_id},
                expect.any(Function),
                mockIntl,
            );

            expect(mockIntl.formatMessage).not.toHaveBeenCalled();
            expect(navigateToScreen).not.toHaveBeenCalled();
        });
    });

    describe('goToPostUpdate', () => {
        it('should navigate to post update screen with correct parameters', async () => {
            const playbookRunId = 'playbook-run-id-1';

            await goToPostUpdate(playbookRunId);

            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_POST_UPDATE,
                {playbookRunId},
            );
        });
    });

    describe('goToSelectPlaybook', () => {
        it('should navigate to select playbook screen with channelId', async () => {
            const channelId = 'channel-id-1';

            await goToSelectPlaybook(mockIntl, channelId);

            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOKS_SELECT_PLAYBOOK,
                {channelId, subtitle: 'Select a playbook'},
            );
        });

        it('should navigate to select playbook screen without channelId', async () => {
            await goToSelectPlaybook(mockIntl);

            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOKS_SELECT_PLAYBOOK,
                {channelId: undefined, subtitle: 'Select a playbook'},
            );
        });
    });

    describe('goToStartARun', () => {
        it('should navigate to start a run screen with correct parameters', async () => {
            const playbook = TestHelper.fakePlaybook({
                id: 'playbook-id-1',
                title: 'Test Playbook',
            });
            const onRunCreated = jest.fn();
            const channelId = 'channel-id-1';

            await goToStartARun(playbook, onRunCreated, channelId);

            expect(CallbackStore.setCallback).toHaveBeenCalledWith(onRunCreated);
            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOKS_START_A_RUN,
                {playbook, channelId, subtitle: playbook.title},
            );
        });

        it('should navigate to start a run screen without channelId', async () => {
            const playbook = TestHelper.fakePlaybook({
                id: 'playbook-id-1',
                title: 'Test Playbook',
            });
            const onRunCreated = jest.fn();

            await goToStartARun(playbook, onRunCreated);

            expect(CallbackStore.setCallback).toHaveBeenCalledWith(onRunCreated);
            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOKS_START_A_RUN,
                {playbook, channelId: undefined, subtitle: playbook.title},
            );
        });
    });

    describe('goToRenameChecklist', () => {
        it('should navigate to rename checklist screen with correct parameters', async () => {
            const currentTitle = 'Checklist Title';
            const onSave = jest.fn();

            await goToRenameChecklist('Run 1', currentTitle, onSave);

            expect(CallbackStore.setCallback).toHaveBeenCalledWith(onSave);
            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_RENAME_CHECKLIST,
                {
                    currentTitle,
                    subtitle: 'Run 1',
                },
            );
        });
    });

    describe('goToAddChecklistItem', () => {
        it('should navigate to add checklist item screen with correct parameters', async () => {
            const onSave = jest.fn();

            await goToAddChecklistItem('Run 1', onSave);

            expect(CallbackStore.setCallback).toHaveBeenCalledWith(onSave);
            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_ADD_CHECKLIST_ITEM,
                {subtitle: 'Run 1'},
            );
        });
    });

    describe('goToRenamePlaybookRun', () => {
        it('should navigate to rename playbook run screen with correct parameters', async () => {
            const currentTitle = 'Playbook Run Title';
            const playbookRunId = 'run-id-123';

            await goToRenamePlaybookRun(currentTitle, playbookRunId);

            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_RENAME_RUN,
                {
                    currentTitle,
                    playbookRunId,
                },
            );
        });
    });

    describe('goToCreateQuickChecklist', () => {
        it('should navigate to create quick checklist screen with correct parameters', () => {
            const channelId = 'channel-id-1';
            const channelName = 'channel-name-1';
            const currentUserId = 'user-id-1';
            const currentTeamId = 'team-id-1';

            goToCreateQuickChecklist(channelId, channelName, currentUserId, currentTeamId);

            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOKS_CREATE_QUICK_CHECKLIST,
                {
                    channelId,
                    channelName,
                    currentUserId,
                    currentTeamId,
                },
            );
        });
    });
});
