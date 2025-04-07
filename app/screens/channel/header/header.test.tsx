// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import NavigationHeader from '@components/navigation_header';
import {goToPlaybookRun, goToPlaybookRuns} from '@playbooks/screens/navigation';
import {renderWithIntl} from '@test/intl-test-helper';

import ChannelHeader from './header';

jest.mock('@components/navigation_header', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(NavigationHeader).mockImplementation((props) => React.createElement('NavigationHeader', {testID: 'navigation-header', ...props}));

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
}));

jest.mock('@playbooks/screens/navigation', () => ({
    goToPlaybookRun: jest.fn(),
    goToPlaybookRuns: jest.fn(),
}));

jest.mock('@calls/state', () => ({
    getCallsConfig: jest.fn().mockReturnValue({
        pluginEnabled: false,
    }),
}));

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

        const {getByTestId} = renderWithIntl(<ChannelHeader {...props}/>);

        const navHeader = getByTestId('navigation-header');
        const playbookButton = (navHeader.props as ComponentProps<typeof NavigationHeader>).rightButtons?.find((button) => button.iconName === 'product-playbooks');
        expect(playbookButton).toBeTruthy();

        playbookButton?.onPress();
        expect(goToPlaybookRuns).toHaveBeenCalledWith(expect.anything(), 'channel-id');
        expect(goToPlaybookRun).not.toHaveBeenCalled();
    });
});
