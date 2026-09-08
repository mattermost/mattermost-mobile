// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {PUSH_PROXY_RESPONSE_NOT_AVAILABLE, PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import {bottomSheet} from '@screens/navigation';
import {renderWithIntl} from '@test/intl-test-helper';

import Header from './header';

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
}));

function getBaseProps(overrides: Partial<ComponentProps<typeof Header>> = {}): ComponentProps<typeof Header> {
    return {
        pushProxyStatus: PUSH_PROXY_STATUS_VERIFIED,
        canCreateChannels: true,
        canJoinChannels: true,
        canInvitePeople: true,
        canJoinOtherTeams: false,
        currentTeamId: 'team-id',
        displayName: 'Test!',
        hasMoreThanOneTeam: false,
        ephemeralModeEnabled: false,
        isZeroPersistenceMode: false,
        ...overrides,
    };
}

describe('components/channel_list/header', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Skipping this test because the snapshot became too big and
    // it errors out.
    it.skip('Channel List Header Component should match snapshot', () => {
        const {toJSON} = renderWithIntl(<Header {...getBaseProps()}/>);

        expect(toJSON()).toMatchSnapshot();
    });

    it('Push notifications disabled show alert icon', () => {
        const wrapper = renderWithIntl(
            <Header {...getBaseProps({pushProxyStatus: PUSH_PROXY_RESPONSE_NOT_AVAILABLE})}/>,
        );

        expect(wrapper.getByTestId('channel_list_header.push_alert')).toBeTruthy();
    });

    it('shows the ephemeral mode indicator when ephemeral mode is enabled', () => {
        const wrapper = renderWithIntl(<Header {...getBaseProps({ephemeralModeEnabled: true})}/>);

        expect(wrapper.getByTestId('channel_list_header.ephemeral_mode')).toBeTruthy();
    });

    it('shows a tooltip when the ephemeral mode indicator is pressed', () => {
        const wrapper = renderWithIntl(<Header {...getBaseProps({ephemeralModeEnabled: true})}/>);

        expect(wrapper.queryByText('Ephemeral mode is on')).toBeNull();

        fireEvent.press(wrapper.getByTestId('channel_list_header.ephemeral_mode'));

        expect(wrapper.getByText('Ephemeral mode is on')).toBeTruthy();
    });

    it('shows a zero persistence tooltip instead when running in zero persistence mode', () => {
        const wrapper = renderWithIntl(<Header {...getBaseProps({ephemeralModeEnabled: true, isZeroPersistenceMode: true})}/>);

        fireEvent.press(wrapper.getByTestId('channel_list_header.ephemeral_mode'));

        expect(wrapper.getByText('Zero Persistence is on')).toBeTruthy();
        expect(wrapper.queryByText('Ephemeral mode is on')).toBeNull();
    });

    it('hides the ephemeral mode indicator when ephemeral mode is disabled', () => {
        const wrapper = renderWithIntl(<Header {...getBaseProps()}/>);

        expect(wrapper.queryByTestId('channel_list_header.ephemeral_mode')).toBeNull();
    });

    describe('team menu affordance', () => {
        it('hides the chevron and does not open a sheet when no team menu items are available', () => {
            const wrapper = renderWithIntl(<Header {...getBaseProps()}/>);

            expect(wrapper.queryByTestId('channel_list_header.team.chevron')).toBeNull();

            fireEvent.press(wrapper.getByTestId('channel_list_header.team.button'));
            expect(bottomSheet).not.toHaveBeenCalled();
        });

        it('shows the chevron and opens a sheet when canJoinOtherTeams is true', () => {
            const wrapper = renderWithIntl(<Header {...getBaseProps({canJoinOtherTeams: true})}/>);

            expect(wrapper.getByTestId('channel_list_header.team.chevron')).toBeTruthy();

            fireEvent.press(wrapper.getByTestId('channel_list_header.team.button'));
            expect(bottomSheet).toHaveBeenCalledTimes(1);
        });

        it('shows the chevron and opens a sheet when hasMoreThanOneTeam is true', () => {
            const wrapper = renderWithIntl(<Header {...getBaseProps({hasMoreThanOneTeam: true})}/>);

            expect(wrapper.getByTestId('channel_list_header.team.chevron')).toBeTruthy();

            fireEvent.press(wrapper.getByTestId('channel_list_header.team.button'));
            expect(bottomSheet).toHaveBeenCalledTimes(1);
        });
    });
});
