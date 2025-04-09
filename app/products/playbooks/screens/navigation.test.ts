// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Screens} from '@constants';
import {goToScreen} from '@screens/navigation';
import TestHelper from '@test/test_helper';

import {goToPlaybookRuns, goToPlaybookRun} from './navigation';

jest.mock('@screens/navigation', () => ({
    goToScreen: jest.fn(),
}));

describe('Playbooks Navigation', () => {
    const mockIntl = TestHelper.fakeIntl();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('goToPlaybookRuns', () => {
        it('should navigate to playbook runs screen with correct parameters', () => {
            const channelId = 'channel-id-1';

            goToPlaybookRuns(mockIntl, channelId);

            expect(mockIntl.formatMessage).toHaveBeenCalledWith({
                id: 'playbooks.playbooks_runs.title',
                defaultMessage: 'Playbook runs',
            });
            expect(goToScreen).toHaveBeenCalledWith(
                Screens.PLAYBOOKS_RUNS,
                'Playbook runs',
                {channelId},
                {},
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
