// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Preferences, Screens} from '@constants';
import {goToScreen} from '@screens/navigation';
import TestHelper from '@test/test_helper';
import {changeOpacity} from '@utils/theme';

import {goToPlaybookRuns, goToPlaybookRun} from './navigation';

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
});
