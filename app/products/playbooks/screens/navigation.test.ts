// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Preferences, Screens} from '@constants';
import {goToScreen} from '@screens/navigation';
import TestHelper from '@test/test_helper';
import {changeOpacity} from '@utils/theme';

import {goToPlaybookRuns, goToPlaybookRun, goToEditCommand, goToSelectUser, goToSelectDate} from './navigation';

jest.mock('@screens/navigation', () => ({
    goToScreen: jest.fn(),
    getThemeFromState: jest.fn(() => require('@constants').Preferences.THEMES.denim),
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
                defaultMessage: 'Playbook runs',
            });
            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOKS_RUNS,
                'Playbook runs',
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
                defaultMessage: 'Playbook run',
            });
            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOK_RUN,
                'Playbook run',
                {playbookRunId},
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
});
