// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {useNavigationHeaderCallButtonForDM} from '@calls/hooks';
import {getCallsConfig} from '@calls/state';
import {DefaultCallsConfig} from '@calls/types/calls';
import NavigationHeader from '@components/navigation_header';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {fetchPlaybookRunsForChannel} from '@playbooks/actions/remote/runs';
import {goToCreateQuickChecklist, goToPlaybookRun, goToPlaybookRuns} from '@playbooks/screens/navigation';
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

jest.mock('@calls/hooks', () => ({
    useNavigationHeaderCallButtonForDM: jest.fn(),
}));
const navigationHeaderCallButton = {id: 'calls', iconName: 'phone' as const, onPress: jest.fn(), testID: 'channel_header.quick_call.button'};

const serverUrl = 'some.server.url';
jest.mock('@context/server');
jest.mocked(useServerUrl).mockReturnValue(serverUrl);

describe('ChannelHeader', () => {
    function getBaseProps(): ComponentProps<typeof ChannelHeader> {
        return {
            channelId: 'channel-id',
            channelType: 'O',
            currentUserId: 'current-user-id',
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
            isChannelAutotranslated: false,
        };
    }

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(getCallsConfig).mockReturnValue({...DefaultCallsConfig, pluginEnabled: false});
        jest.mocked(useNavigationHeaderCallButtonForDM).mockReturnValue(navigationHeaderCallButton);
    });

    function enableCalls(props: ComponentProps<typeof ChannelHeader>) {
        jest.mocked(getCallsConfig).mockReturnValue({...DefaultCallsConfig, pluginEnabled: true});
        props.callsEnabledInChannel = true;
        props.groupCallsAllowed = true;
    }

    function getRightButtons(navHeader: {props: unknown}) {
        return (navHeader.props as ComponentProps<typeof NavigationHeader>).rightButtons;
    }

    function getQuickCallButton(navHeader: {props: unknown}) {
        return getRightButtons(navHeader)?.find((button) => button.testID === navigationHeaderCallButton.testID);
    }

    it('should show the quick call button in a DM when calls are available', () => {
        const props = getBaseProps();
        props.channelType = General.DM_CHANNEL;
        enableCalls(props);

        const {getByTestId} = renderWithIntl(<ChannelHeader {...props}/>);

        expect(getQuickCallButton(getByTestId('navigation-header'))).toBeTruthy();
        expect(useNavigationHeaderCallButtonForDM).toHaveBeenCalledWith('channel-id', General.DM_CHANNEL);
    });

    it('should not show the quick call button when calls are disabled in the DM', () => {
        const props = getBaseProps();
        props.channelType = General.DM_CHANNEL;
        enableCalls(props);
        props.callsEnabledInChannel = false;

        const {getByTestId} = renderWithIntl(<ChannelHeader {...props}/>);

        expect(getQuickCallButton(getByTestId('navigation-header'))).toBeUndefined();
    });

    it('should not show the quick call button when the calls plugin is disabled', () => {
        const props = getBaseProps();
        props.channelType = General.DM_CHANNEL;
        enableCalls(props);
        jest.mocked(getCallsConfig).mockReturnValue({...DefaultCallsConfig, pluginEnabled: false});

        const {getByTestId} = renderWithIntl(<ChannelHeader {...props}/>);

        expect(getQuickCallButton(getByTestId('navigation-header'))).toBeUndefined();
    });

    it('should not show the quick call button outside of DMs', () => {
        const props = getBaseProps();
        enableCalls(props);

        props.channelType = General.GM_CHANNEL;
        const {getByTestId, rerender} = renderWithIntl(<ChannelHeader {...props}/>);
        const navHeader = getByTestId('navigation-header');
        expect(getQuickCallButton(navHeader)).toBeUndefined();

        props.channelType = General.OPEN_CHANNEL;
        rerender(<ChannelHeader {...props}/>);
        expect(getQuickCallButton(navHeader)).toBeUndefined();
    });

    it('should not show the quick call button when the calls hook returns no button', () => {
        const props = getBaseProps();
        props.channelType = General.DM_CHANNEL;
        enableCalls(props);
        jest.mocked(useNavigationHeaderCallButtonForDM).mockReturnValue(undefined);

        const {getByTestId} = renderWithIntl(<ChannelHeader {...props}/>);

        expect(getQuickCallButton(getByTestId('navigation-header'))).toBeUndefined();
    });

    it('should place the quick call button before the overflow menu', () => {
        const props = getBaseProps();
        props.channelType = General.DM_CHANNEL;
        enableCalls(props);

        const {getByTestId} = renderWithIntl(<ChannelHeader {...props}/>);

        const rightButtons = (getByTestId('navigation-header').props as ComponentProps<typeof NavigationHeader>).rightButtons;
        expect(rightButtons?.map((button) => button.iconName)).toEqual(['phone', 'dots-horizontal']);
    });

    it('shows playbook button with "+" when there are no active runs', () => {
        const props = getBaseProps();
        props.hasPlaybookRuns = false;
        props.playbooksActiveRuns = 0;
        props.isPlaybooksEnabled = true;

        const {getByTestId} = renderWithIntl(<ChannelHeader {...props}/>);

        const navHeader = getByTestId('navigation-header');
        expect(navHeader.props.rightButtons).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    iconName: 'product-playbooks',
                    count: '+',
                }),
            ]),
        );
    });

    it('does not show playbook button when is DM or GM', () => {
        const props = getBaseProps();
        props.hasPlaybookRuns = true;
        props.playbooksActiveRuns = 1;
        props.channelType = General.DM_CHANNEL;
        const {getByTestId, rerender} = renderWithIntl(<ChannelHeader {...props}/>);
        const navHeader = getByTestId('navigation-header');
        let rightButtons = navHeader.props.rightButtons;
        expect(rightButtons).not.toEqual(expect.arrayContaining(
            [
                expect.objectContaining({
                    iconName: 'product-playbooks',
                }),
            ]),
        );

        props.channelType = General.GM_CHANNEL;
        rerender(<ChannelHeader {...props}/>);
        rightButtons = navHeader.props.rightButtons;
        expect(rightButtons).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    iconName: 'product-playbooks',
                }),
            ]),
        );

        props.channelType = General.OPEN_CHANNEL;
        rerender(<ChannelHeader {...props}/>);
        rightButtons = navHeader.props.rightButtons;
        expect(rightButtons).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
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
        expect(goToPlaybookRun).toHaveBeenCalledWith('run-id');
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
        expect(goToPlaybookRuns).toHaveBeenCalledWith('channel-id', 'Test Channel');
        expect(goToPlaybookRun).not.toHaveBeenCalled();
    });

    it('navigates to create quick checklist screen when clicking + button with no active runs', () => {
        const props = getBaseProps();
        props.playbooksActiveRuns = 0;
        props.hasPlaybookRuns = false;
        props.displayName = 'Test Channel';

        const {getByTestId} = renderWithIntl(<ChannelHeader {...props}/>);

        const navHeader = getByTestId('navigation-header');
        const playbookButton = (navHeader.props as ComponentProps<typeof NavigationHeader>).rightButtons?.find((button) => button.iconName === 'product-playbooks');
        expect(playbookButton).toBeTruthy();
        expect(playbookButton?.count).toBe('+');

        playbookButton?.onPress();

        expect(goToCreateQuickChecklist).toHaveBeenCalledWith(
            'channel-id',
            'Test Channel',
            'current-user-id',
            'team-id',
        );
        expect(goToPlaybookRun).not.toHaveBeenCalled();
        expect(goToPlaybookRuns).not.toHaveBeenCalled();
    });

    it('should not fetch runs when playbooks are disabled', async () => {
        const ephemeralGetSpy = jest.spyOn(EphemeralStore, 'getChannelPlaybooksSynced');

        const props = getBaseProps();
        props.isPlaybooksEnabled = false;
        ephemeralGetSpy.mockReturnValue(false);

        renderWithIntl(<ChannelHeader {...props}/>);

        await waitFor(() => {
            expect(ephemeralGetSpy).not.toHaveBeenCalled();
            expect(fetchPlaybookRunsForChannel).not.toHaveBeenCalled();
        });
    });

    it('should not fetch runs when we already have the runs synced', async () => {
        const ephemeralGetSpy = jest.spyOn(EphemeralStore, 'getChannelPlaybooksSynced');

        const props = getBaseProps();
        props.isPlaybooksEnabled = true;

        ephemeralGetSpy.mockReturnValue(true);

        renderWithIntl(<ChannelHeader {...props}/>);

        await waitFor(() => {
            expect(ephemeralGetSpy).toHaveBeenCalledWith(serverUrl, 'channel-id');
            expect(fetchPlaybookRunsForChannel).not.toHaveBeenCalled();
        });
    });
});
