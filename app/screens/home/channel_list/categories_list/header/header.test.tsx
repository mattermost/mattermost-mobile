// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {PUSH_PROXY_RESPONSE_NOT_AVAILABLE, PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {bottomSheet} from '@screens/navigation';
import {renderWithIntl} from '@test/intl-test-helper';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {showSnackBar} from '@utils/snack_bar';

import Header from './header';
import {SEPARATOR_HEIGHT} from './plus_menu/separator';

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
}));

jest.mock('@utils/snack_bar', () => ({
    showSnackBar: jest.fn(),
}));

function getBaseProps(overrides: Partial<ComponentProps<typeof Header>> = {}): ComponentProps<typeof Header> {
    return {
        pushProxyStatus: PUSH_PROXY_STATUS_VERIFIED,
        canCreateChannels: true,
        canJoinChannels: true,
        canInvitePeople: true,
        canStartDirectMessage: true,
        canJoinOtherTeams: false,
        currentTeamId: 'team-id',
        displayName: 'Test!',
        hasMoreThanOneTeam: false,
        ephemeralModeEnabled: false,
        ephemeralModePurgeHours: 0,
        ephemeralModeCleanupDays: 0,
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

    it('should show ephemeral mode indicator when enabled', () => {
        const wrapper = renderWithIntl(<Header {...getBaseProps({ephemeralModeEnabled: true})}/>);

        expect(wrapper.getByTestId('channel_list_header.ephemeral_mode')).toBeTruthy();
    });

    it('should show the ephemeral mode snackbar with the configured timers on press', () => {
        const wrapper = renderWithIntl(
            <Header {...getBaseProps({ephemeralModeEnabled: true, ephemeralModePurgeHours: 24, ephemeralModeCleanupDays: 7})}/>,
        );

        fireEvent.press(wrapper.getByTestId('channel_list_header.ephemeral_mode'));

        expect(showSnackBar).toHaveBeenCalledWith({
            barType: SNACK_BAR_TYPE.EPHEMERAL_MODE_ENABLED,
            descriptionValues: {hours: 24, days: 7},
        });
    });

    it('should show the zero persistence snackbar on press in zero persistence mode', () => {
        const wrapper = renderWithIntl(<Header {...getBaseProps({ephemeralModeEnabled: true, isZeroPersistenceMode: true})}/>);

        fireEvent.press(wrapper.getByTestId('channel_list_header.ephemeral_mode'));

        expect(showSnackBar).toHaveBeenCalledWith({barType: SNACK_BAR_TYPE.EPHEMERAL_MODE_ZERO_PERSISTENCE_ACTIVE});
    });

    it('should hide ephemeral mode indicator when disabled', () => {
        const wrapper = renderWithIntl(<Header {...getBaseProps()}/>);

        expect(wrapper.queryByTestId('channel_list_header.ephemeral_mode')).toBeNull();
    });

    describe('plus menu', () => {
        it('should size the menu for every item and the separator above inviting people', () => {
            const wrapper = renderWithIntl(<Header {...getBaseProps()}/>);

            fireEvent.press(wrapper.getByTestId('channel_list_header.plus.button'));

            expect(bottomSheet).toHaveBeenCalledWith(expect.any(Function), [1, bottomSheetSnapPoint(4, ITEM_HEIGHT) + SEPARATOR_HEIGHT]);
        });

        it('should leave out opening a direct message while starting one is not allowed', () => {
            const wrapper = renderWithIntl(<Header {...getBaseProps({canStartDirectMessage: false})}/>);

            fireEvent.press(wrapper.getByTestId('channel_list_header.plus.button'));

            expect(bottomSheet).toHaveBeenCalledWith(expect.any(Function), [1, bottomSheetSnapPoint(3, ITEM_HEIGHT) + SEPARATOR_HEIGHT]);
        });

        it('should not separate inviting people when it is the only item', () => {
            const wrapper = renderWithIntl(<Header {...getBaseProps({canCreateChannels: false, canJoinChannels: false, canStartDirectMessage: false})}/>);

            fireEvent.press(wrapper.getByTestId('channel_list_header.plus.button'));

            expect(bottomSheet).toHaveBeenCalledWith(expect.any(Function), [1, bottomSheetSnapPoint(1, ITEM_HEIGHT)]);
        });

        it('should hide the plus button when no item remains', () => {
            const wrapper = renderWithIntl(<Header {...getBaseProps({canCreateChannels: false, canJoinChannels: false, canStartDirectMessage: false, canInvitePeople: false})}/>);

            expect(wrapper.queryByTestId('channel_list_header.plus.button')).toBeNull();
        });
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
