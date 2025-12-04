// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {joinIfNeededAndSwitchToChannel} from '@actions/remote/channel';
import {Preferences, Screens} from '@constants';
import {goToScreen} from '@screens/navigation';
import TestHelper from '@test/test_helper';
import {changeOpacity} from '@utils/theme';

import {goToPlaybookRuns, goToPlaybookRun, goToParticipantPlaybooks, goToPlaybookRunWithChannelSwitch, goToEditCommand, goToSelectUser, goToSelectDate, goToPostUpdate, goToSelectPlaybook, goToStartARun} from './navigation';

jest.mock('@screens/navigation', () => ({
    goToScreen: jest.fn(),
    getThemeFromState: jest.fn(() => require('@constants').Preferences.THEMES.denim),
}));

jest.mock('@actions/remote/channel', () => ({
    joinIfNeededAndSwitchToChannel: jest.fn(),
}));

describe('Playbooks Navigation', () => {
    const mockIntl = TestHelper.fakeIntl();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('goToPlaybookRuns', () => {
        it('should navigate to playbook runs screen with correct parameters', () => {
            const channelId = 'channel-id-1';
            const channelName = 'channel-name-1';
            goToPlaybookRuns(mockIntl, channelId, channelName);

            expect(mockIntl.formatMessage).toHaveBeenCalledWith({
                id: 'playbooks.playbooks_runs.title',
                defaultMessage: 'Playbook checklists',
            });
            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOKS_RUNS,
                'Playbook checklists',
                {channelId},
                expect.objectContaining({
                    topBar: expect.objectContaining({
                        subtitle: {
                            text: channelName,
                            color: changeOpacity(Preferences.THEMES.denim.sidebarText, 0.72),
                        },
                    }),
                }),
            );
        });
    });

    describe('goToPlaybookRun', () => {
        it('should navigate to single playbook run screen with correct parameters', async () => {
            const playbookRunId = 'playbook-run-id-1';

            await goToPlaybookRun(mockIntl, playbookRunId);

            expect(mockIntl.formatMessage).toHaveBeenCalledWith({
                id: 'playbooks.playbook_run.title',
                defaultMessage: 'Playbook checklist',
            });
            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_RUN,
                'Playbook checklist',
                {playbookRunId},
                {},
            );
        });

        it('should navigate to single playbook run screen with playbookRun parameter', async () => {
            const playbookRunId = 'playbook-run-id-1';
            const playbookRun = TestHelper.fakePlaybookRun({
                id: playbookRunId,
            });

            await goToPlaybookRun(mockIntl, playbookRunId, playbookRun);

            expect(mockIntl.formatMessage).toHaveBeenCalledWith({
                id: 'playbooks.playbook_run.title',
                defaultMessage: 'Playbook checklist',
            });
            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_RUN,
                'Playbook checklist',
                {playbookRunId, playbookRun},
                {},
            );
        });
    });

    describe('goToEditCommand', () => {
        it('should navigate to edit command screen with correct parameters', async () => {
            const command = 'test command';
            const channelId = 'channel-id-1';
            const updateCommand = jest.fn();

            await goToEditCommand(mockIntl, Preferences.THEMES.denim, 'Run 1', command, channelId, updateCommand);

            expect(mockIntl.formatMessage).toHaveBeenCalledWith({
                id: 'playbooks.edit_command.title',
                defaultMessage: 'Slash command',
            });
            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_EDIT_COMMAND,
                'Slash command',
                {
                    savedCommand: command,
                    updateCommand,
                    channelId,
                },
                {
                    topBar: {
                        subtitle: {
                            text: 'Run 1',
                            color: changeOpacity(Preferences.THEMES.denim.sidebarHeaderTextColor, 0.72),
                        },
                    },
                },
            );
        });

        it('should navigate to edit command screen with null command', async () => {
            const channelId = 'channel-id-1';
            const updateCommand = jest.fn();

            await goToEditCommand(mockIntl, Preferences.THEMES.denim, 'Run 1', null, channelId, updateCommand);

            expect(mockIntl.formatMessage).toHaveBeenCalledWith({
                id: 'playbooks.edit_command.title',
                defaultMessage: 'Slash command',
            });
            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_EDIT_COMMAND,
                'Slash command',
                {
                    savedCommand: null,
                    updateCommand,
                    channelId,
                },
                {
                    topBar: {
                        subtitle: {
                            text: 'Run 1',
                            color: changeOpacity(Preferences.THEMES.denim.sidebarHeaderTextColor, 0.72),
                        },
                    },
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

            await goToSelectUser(Preferences.THEMES.denim, 'Run 1', title, participantIds, selected, handleSelect, handleRemove);

            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_SELECT_USER,
                title,
                {
                    participantIds,
                    selected,
                    handleSelect,
                    handleRemove,
                },
                {
                    topBar: {
                        subtitle: {
                            text: 'Run 1',
                            color: changeOpacity(Preferences.THEMES.denim.sidebarHeaderTextColor, 0.72),
                        },
                    },
                },
            );
        });

        it('should navigate to select user screen without handleRemove parameter', async () => {
            const title = 'Select User';
            const participantIds = ['user1', 'user2', 'user3'];
            const selected = 'user2';
            const handleSelect = jest.fn();

            await goToSelectUser(Preferences.THEMES.denim, 'Run 1', title, participantIds, selected, handleSelect);

            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_SELECT_USER,
                title,
                {
                    participantIds,
                    selected,
                    handleSelect,
                    handleRemove: undefined,
                },
                {
                    topBar: {
                        subtitle: {
                            text: 'Run 1',
                            color: changeOpacity(Preferences.THEMES.denim.sidebarHeaderTextColor, 0.72),
                        },
                    },
                },
            );
        });
    });

    describe('goToSelectDate', () => {
        it('should navigate to select date screen with selected date', async () => {
            const onSave = jest.fn();
            const selectedDate = 1640995200000; // January 1, 2022

            await goToSelectDate(mockIntl, Preferences.THEMES.denim, 'Run 1', onSave, selectedDate);

            expect(mockIntl.formatMessage).toHaveBeenCalledWith({
                id: 'playbooks.select_date.title',
                defaultMessage: 'Due date',
            });
            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOKS_SELECT_DATE,
                'Due date',
                {
                    onSave,
                    selectedDate,
                },
                {
                    topBar: {
                        subtitle: {
                            text: 'Run 1',
                            color: changeOpacity(Preferences.THEMES.denim.sidebarHeaderTextColor, 0.72),
                        },
                    },
                },
            );
        });

        it('should navigate to select date screen without selected date', async () => {
            const onSave = jest.fn();

            await goToSelectDate(mockIntl, Preferences.THEMES.denim, 'Run 1', onSave, undefined);

            expect(mockIntl.formatMessage).toHaveBeenCalledWith({
                id: 'playbooks.select_date.title',
                defaultMessage: 'Due date',
            });
            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOKS_SELECT_DATE,
                'Due date',
                {
                    onSave,
                    selectedDate: undefined,
                },
                {
                    topBar: {
                        subtitle: {
                            text: 'Run 1',
                            color: changeOpacity(Preferences.THEMES.denim.sidebarHeaderTextColor, 0.72),
                        },
                    },
                },
            );
        });
    });

    describe('goToParticipantPlaybooks', () => {
        it('should navigate to participant playbooks screen with correct parameters', () => {
            goToParticipantPlaybooks(mockIntl);

            expect(mockIntl.formatMessage).toHaveBeenCalledWith({
                id: 'playbooks.participant_playbooks.title',
                defaultMessage: 'Playbook checklists',
            });
            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PARTICIPANT_PLAYBOOKS,
                'Playbook checklists',
                {},
                {},
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

            expect(mockIntl.formatMessage).toHaveBeenCalledWith({
                id: 'playbooks.playbook_run.title',
                defaultMessage: 'Playbook checklist',
            });
            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_RUN,
                'Playbook checklist',
                {playbookRunId: mockPlaybookRun.id},
                {},
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

            expect(mockIntl.formatMessage).toHaveBeenCalledWith({
                id: 'playbooks.playbook_run.title',
                defaultMessage: 'Playbook checklist',
            });
            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_RUN,
                'Playbook checklist',
                {playbookRunId: mockPlaybookRunModel.id},
                {},
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
            expect(goToScreen).not.toHaveBeenCalled();
        });
    });

    describe('goToPostUpdate', () => {
        it('should navigate to post update screen with correct parameters', async () => {
            const playbookRunId = 'playbook-run-id-1';

            await goToPostUpdate(mockIntl, playbookRunId);

            expect(mockIntl.formatMessage).toHaveBeenCalledWith({
                id: 'playbooks.post_update.title',
                defaultMessage: 'Post update',
            });
            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_POST_UPDATE,
                'Post update',
                {playbookRunId},
                {},
            );
        });
    });

    describe('goToSelectPlaybook', () => {
        it('should navigate to select playbook screen with channelId', async () => {
            const channelId = 'channel-id-1';

            await goToSelectPlaybook(mockIntl, Preferences.THEMES.denim, channelId);

            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOKS_SELECT_PLAYBOOK,
                'New',
                {channelId},
                {
                    topBar: {
                        subtitle: {
                            text: 'Select a playbook',
                            color: changeOpacity(Preferences.THEMES.denim.sidebarText, 0.72),
                        },
                    },
                },
            );
        });

        it('should navigate to select playbook screen without channelId', async () => {
            await goToSelectPlaybook(mockIntl, Preferences.THEMES.denim);

            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOKS_SELECT_PLAYBOOK,
                'New',
                {channelId: undefined},
                {
                    topBar: {
                        subtitle: {
                            text: 'Select a playbook',
                            color: changeOpacity(Preferences.THEMES.denim.sidebarText, 0.72),
                        },
                    },
                },
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

            await goToStartARun(mockIntl, Preferences.THEMES.denim, playbook, onRunCreated, channelId);

            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOKS_START_A_RUN,
                'New',
                {playbook, onRunCreated, channelId},
                {
                    topBar: {
                        subtitle: {
                            text: playbook.title,
                            color: changeOpacity(Preferences.THEMES.denim.sidebarText, 0.72),
                        },
                    },
                },
            );
        });

        it('should navigate to start a run screen without channelId', async () => {
            const playbook = TestHelper.fakePlaybook({
                id: 'playbook-id-1',
                title: 'Test Playbook',
            });
            const onRunCreated = jest.fn();

            await goToStartARun(mockIntl, Preferences.THEMES.denim, playbook, onRunCreated);

            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOKS_START_A_RUN,
                'New',
                {playbook, onRunCreated, channelId: undefined},
                {
                    topBar: {
                        subtitle: {
                            text: playbook.title,
                            color: changeOpacity(Preferences.THEMES.denim.sidebarText, 0.72),
                        },
                    },
                },
            );
        });
    });
});
