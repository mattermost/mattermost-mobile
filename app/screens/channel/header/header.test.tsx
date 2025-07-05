// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import NavigationHeader from '@components/navigation_header';
import {useServerUrl} from '@context/server';
import {fetchPlaybookRunsForChannel} from '@playbooks/actions/remote/runs';
import {goToPlaybookRun, goToPlaybookRuns} from '@playbooks/screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {renderWithIntl, waitFor} from '@test/intl-test-helper';

import ChannelHeader from './header';

jest.mock('@components/navigation_header', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(NavigationHeader).mockImplementation((props) => React.createElement('NavigationHeader', {testID: 'navigation-header', ...props}));

jest.mock('@screens/navigation');
jest.mock('@playbooks/screens/navigation');
jest.mock('@playbooks/actions/remote/runs');

jest.mock('@calls/state', () => ({
    getCallsConfig: jest.fn().mockReturnValue({
        pluginEnabled: false,
    }),
}));

const serverUrl = 'some.server.url';
jest.mock('@context/server');
jest.mocked(useServerUrl).mockReturnValue(serverUrl);

describe('ChannelHeader', () => {
    function getBaseProps(): ComponentProps<typeof ChannelHeader> {
        return {
            channelId: 'channel-id',
            channelType: 'O',
            displayName: 'Test Channel',
            teamId: 'team-id',
            hasPlaybookRuns: false,
            playbooksActiveRuns: 0,
            callsEnabledInChannel: false,
            groupCallsAllowed: false,
            isBookmarksEnabled: false,
            canAddBookmarks: false,
            hasBookmarks: false,
            shouldRenderBookmarks: false,
            isCustomStatusEnabled: false,
            isCustomStatusExpired: false,
            isOwnDirectMessage: false,
            shouldRenderChannelBanner: false,
            isPlaybooksEnabled: true,
        };
    }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('does not show playbook button when there are no active runs', () => {
        const props = getBaseProps();
        props.hasPlaybookRuns = false;
        props.playbooksActiveRuns = 0;
        renderWithIntl(<ChannelHeader {...props}/>);

        const navHeader = jest.mocked(NavigationHeader).mock.calls[0][0];
        expect(navHeader.rightButtons).toEqual(
            expect.arrayContaining([
                expect.not.objectContaining({
                    iconName: 'product-playbooks',
                }),
            ]),
        );
    });

    it('shows playbook button with count when there are active runs', () => {
        const props = getBaseProps();
        props.playbooksActiveRuns = 3;
        props.hasPlaybookRuns = true;

        const {getByTestId} = renderWithIntl(<ChannelHeader {...props}/>);

        const navHeader = getByTestId('navigation-header');
        expect(navHeader.props.rightButtons).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    iconName: 'product-playbooks',
                    count: 3,
                }),
            ]),
        );
    });

    it('navigates to single playbook run when there is an active playbook provided', () => {
        const props = getBaseProps();
        props.playbooksActiveRuns = 1;
        props.hasPlaybookRuns = true;
        props.activeRunId = 'run-id';

        const {getByTestId} = renderWithIntl(<ChannelHeader {...props}/>);

        const navHeader = getByTestId('navigation-header');
        const playbookButton = (navHeader.props as ComponentProps<typeof NavigationHeader>).rightButtons?.find((button) => button.iconName === 'product-playbooks');
        expect(playbookButton).toBeTruthy();

        playbookButton?.onPress();
        expect(goToPlaybookRun).toHaveBeenCalledWith(expect.anything(), 'run-id');
        expect(goToPlaybookRuns).not.toHaveBeenCalled();
    });

    it('navigates to playbook runs list when there is no active playbook provided', () => {
        const props = getBaseProps();
        props.activeRunId = undefined;
        props.playbooksActiveRuns = 3;
        props.hasPlaybookRuns = true;
        props.displayName = 'Test Channel';

        const {getByTestId} = renderWithIntl(<ChannelHeader {...props}/>);

        const navHeader = getByTestId('navigation-header');
        const playbookButton = (navHeader.props as ComponentProps<typeof NavigationHeader>).rightButtons?.find((button) => button.iconName === 'product-playbooks');
        expect(playbookButton).toBeTruthy();

        playbookButton?.onPress();
        expect(goToPlaybookRuns).toHaveBeenCalledWith(expect.anything(), 'channel-id', 'Test Channel');
        expect(goToPlaybookRun).not.toHaveBeenCalled();
    });

    it('should set the ephemeral store when we fetch the playbook runs for the channel', async () => {
        const ephemeralGetSpy = jest.spyOn(EphemeralStore, 'getChannelPlaybooksSynced');
        const ephemeralSetSpy = jest.spyOn(EphemeralStore, 'setChannelPlaybooksSynced');

        const props = getBaseProps();
        props.isPlaybooksEnabled = true;

        ephemeralGetSpy.mockReturnValue(false);

        jest.mocked(fetchPlaybookRunsForChannel).mockResolvedValue({
            runs: [],
        });

        renderWithIntl(<ChannelHeader {...props}/>);

        await waitFor(() => {
            expect(ephemeralGetSpy).toHaveBeenCalledWith(serverUrl, 'channel-id');
            expect(fetchPlaybookRunsForChannel).toHaveBeenCalledWith(serverUrl, 'channel-id');
            expect(ephemeralSetSpy).toHaveBeenCalledWith(serverUrl, 'channel-id');
        });
    });

    it('should not fetch runs when playbooks are disabled', async () => {
        const ephemeralGetSpy = jest.spyOn(EphemeralStore, 'getChannelPlaybooksSynced');
        const ephemeralSetSpy = jest.spyOn(EphemeralStore, 'setChannelPlaybooksSynced');

        const props = getBaseProps();
        props.isPlaybooksEnabled = false;
        ephemeralGetSpy.mockReturnValue(false);

        renderWithIntl(<ChannelHeader {...props}/>);

        await waitFor(() => {
            expect(ephemeralGetSpy).not.toHaveBeenCalled();
            expect(ephemeralSetSpy).not.toHaveBeenCalled();
            expect(fetchPlaybookRunsForChannel).not.toHaveBeenCalled();
        });
    });

    it('should not fetch runs when we already have the runs synced', async () => {
        const ephemeralGetSpy = jest.spyOn(EphemeralStore, 'getChannelPlaybooksSynced');
        const ephemeralSetSpy = jest.spyOn(EphemeralStore, 'setChannelPlaybooksSynced');

        const props = getBaseProps();
        props.isPlaybooksEnabled = true;

        ephemeralGetSpy.mockReturnValue(true);

        renderWithIntl(<ChannelHeader {...props}/>);

        await waitFor(() => {
            expect(ephemeralGetSpy).toHaveBeenCalledWith(serverUrl, 'channel-id');
            expect(ephemeralSetSpy).not.toHaveBeenCalled();
            expect(fetchPlaybookRunsForChannel).not.toHaveBeenCalled();
        });
    });

    it('should not set the ephemeral store when there is an error fetching the runs', async () => {
        const ephemeralGetSpy = jest.spyOn(EphemeralStore, 'getChannelPlaybooksSynced');
        const ephemeralSetSpy = jest.spyOn(EphemeralStore, 'setChannelPlaybooksSynced');

        const props = getBaseProps();
        props.isPlaybooksEnabled = true;

        ephemeralGetSpy.mockReturnValue(false);

        jest.mocked(fetchPlaybookRunsForChannel).mockResolvedValue({error: new Error('Error fetching runs')});

        renderWithIntl(<ChannelHeader {...props}/>);

        await waitFor(() => {
            expect(ephemeralGetSpy).toHaveBeenCalledWith(serverUrl, 'channel-id');
            expect(ephemeralSetSpy).not.toHaveBeenCalled();
            expect(fetchPlaybookRunsForChannel).toHaveBeenCalledWith(serverUrl, 'channel-id');
        });
    });
});
