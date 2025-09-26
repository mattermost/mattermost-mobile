// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {fetchPlaybookRunsForChannel} from '@playbooks/actions/remote/runs';
import {updatePlaybooksVersion} from '@playbooks/actions/remote/version';
import {fetchIsPlaybooksEnabled} from '@playbooks/database/queries/version';
import {getCurrentChannelId} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';
import NavigationStore from '@store/navigation_store';
import {isTablet} from '@utils/helpers';

import {handlePlaybookReconnect} from './reconnect';

const serverUrl = 'test-server.com';

jest.mock('@playbooks/actions/remote/runs');
jest.mock('@playbooks/actions/remote/version');
jest.mock('@playbooks/database/queries/version');
jest.mock('@queries/servers/system');
jest.mock('@utils/helpers');

describe('handlePlaybookReconnect', () => {
    const mockCurrentChannelId = 'channel-123';

    beforeEach(async () => {
        jest.clearAllMocks();

        await DatabaseManager.init([serverUrl]);

        jest.mocked(updatePlaybooksVersion).mockResolvedValue({data: true});
        jest.mocked(fetchIsPlaybooksEnabled).mockResolvedValue(false);
        jest.mocked(getCurrentChannelId).mockResolvedValue(mockCurrentChannelId);
        jest.mocked(fetchPlaybookRunsForChannel).mockResolvedValue({runs: []});
        jest.mocked(isTablet).mockReturnValue(false);
    });

    afterEach(async () => {
        await DatabaseManager.deleteServerDatabase(serverUrl);
    });

    it('should return early when database is not found', async () => {
        const clearSpy = jest.spyOn(EphemeralStore, 'clearChannelPlaybooksSynced');
        const getScreensSpy = jest.spyOn(NavigationStore, 'getScreensInStack');
        await DatabaseManager.deleteServerDatabase(serverUrl);

        await handlePlaybookReconnect(serverUrl);

        expect(clearSpy).not.toHaveBeenCalled();
        expect(updatePlaybooksVersion).not.toHaveBeenCalled();
        expect(getScreensSpy).not.toHaveBeenCalled();
    });

    it('should clear channel playbooks synced state', async () => {
        const clearSpy = jest.spyOn(EphemeralStore, 'clearChannelPlaybooksSynced');

        await handlePlaybookReconnect(serverUrl);

        expect(clearSpy).toHaveBeenCalledWith(serverUrl);
        expect(clearSpy).toHaveBeenCalledTimes(1);
    });

    it('should update playbooks version', async () => {
        await handlePlaybookReconnect(serverUrl);

        expect(updatePlaybooksVersion).toHaveBeenCalledWith(serverUrl);
        expect(updatePlaybooksVersion).toHaveBeenCalledTimes(1);
    });

    describe('on phone device', () => {
        it('should not fetch playbook runs when not on channel screen', async () => {
            const getScreensSpy = jest.spyOn(NavigationStore, 'getScreensInStack').mockReturnValue([Screens.HOME, Screens.THREAD]);

            await handlePlaybookReconnect(serverUrl);

            expect(getScreensSpy).toHaveBeenCalled();
            expect(fetchIsPlaybooksEnabled).not.toHaveBeenCalled();
            expect(getCurrentChannelId).not.toHaveBeenCalled();
            expect(fetchPlaybookRunsForChannel).not.toHaveBeenCalled();
        });

        it('should not fetch playbook runs when playbooks are disabled', async () => {
            const getScreensSpy = jest.spyOn(NavigationStore, 'getScreensInStack').mockReturnValue([Screens.HOME, Screens.CHANNEL, Screens.THREAD]);
            jest.mocked(fetchIsPlaybooksEnabled).mockResolvedValue(false);

            await handlePlaybookReconnect(serverUrl);

            expect(getScreensSpy).toHaveBeenCalled();
            expect(fetchIsPlaybooksEnabled).toHaveBeenCalled();
            expect(getCurrentChannelId).not.toHaveBeenCalled();
            expect(fetchPlaybookRunsForChannel).not.toHaveBeenCalled();
        });

        it('should fetch playbook runs when on channel screen and playbooks are enabled', async () => {
            const getScreensSpy = jest.spyOn(NavigationStore, 'getScreensInStack').mockReturnValue([Screens.CHANNEL]);
            jest.mocked(fetchIsPlaybooksEnabled).mockResolvedValue(true);

            await handlePlaybookReconnect(serverUrl);

            expect(getScreensSpy).toHaveBeenCalled();
            expect(fetchIsPlaybooksEnabled).toHaveBeenCalled();
            expect(getCurrentChannelId).toHaveBeenCalled();
            expect(fetchPlaybookRunsForChannel).toHaveBeenCalledWith(serverUrl, mockCurrentChannelId);
            expect(fetchPlaybookRunsForChannel).toHaveBeenCalledTimes(1);
        });
    });

    describe('on tablet device', () => {
        it('should fetch playbook runs when playbooks are enabled and there is a channel id', async () => {
            const getScreensSpy = jest.spyOn(NavigationStore, 'getScreensInStack').mockReturnValue([Screens.HOME]);
            jest.mocked(fetchIsPlaybooksEnabled).mockResolvedValue(true);
            jest.mocked(isTablet).mockReturnValueOnce(true);

            await handlePlaybookReconnect(serverUrl);

            expect(getScreensSpy).toHaveBeenCalled();
            expect(fetchIsPlaybooksEnabled).toHaveBeenCalled();
            expect(getCurrentChannelId).toHaveBeenCalled();
            expect(fetchPlaybookRunsForChannel).toHaveBeenCalledWith(serverUrl, mockCurrentChannelId);
            expect(fetchPlaybookRunsForChannel).toHaveBeenCalledTimes(1);
        });

        it('should not fetch playbook runs when playbooks are enabled and there is no channel id', async () => {
            const getScreensSpy = jest.spyOn(NavigationStore, 'getScreensInStack').mockReturnValue([Screens.HOME]);
            jest.mocked(fetchIsPlaybooksEnabled).mockResolvedValue(true);
            jest.mocked(isTablet).mockReturnValueOnce(true);
            jest.mocked(getCurrentChannelId).mockResolvedValue('');

            await handlePlaybookReconnect(serverUrl);

            expect(getScreensSpy).toHaveBeenCalled();
            expect(fetchIsPlaybooksEnabled).toHaveBeenCalled();
            expect(getCurrentChannelId).toHaveBeenCalled();
            expect(fetchPlaybookRunsForChannel).not.toHaveBeenCalled();
        });

        it('should not fetch playbook runs when playbooks are disabled', async () => {
            const getScreensSpy = jest.spyOn(NavigationStore, 'getScreensInStack').mockReturnValue([Screens.HOME]);
            jest.mocked(fetchIsPlaybooksEnabled).mockResolvedValue(false);
            jest.mocked(isTablet).mockReturnValueOnce(true);

            await handlePlaybookReconnect(serverUrl);

            expect(getScreensSpy).toHaveBeenCalled();
            expect(fetchIsPlaybooksEnabled).toHaveBeenCalled();
            expect(getCurrentChannelId).not.toHaveBeenCalled();
            expect(fetchPlaybookRunsForChannel).not.toHaveBeenCalled();
        });
    });
});
