// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';
import Share from 'react-native-share';

import TeamIcon from '@components/team_sidebar/team_list/team_item/team_icon';
import {useServerDisplayName} from '@context/server';
import {act, fireEvent, renderWithIntl, waitFor} from '@test/intl-test-helper';

import SelectionTeamBar from './selection_team_bar';

jest.mock('react-native-share', () => ({
    __esModule: true,
    default: {
        open: jest.fn(),
    },
}));

jest.mock('@context/server', () => ({
    useServerDisplayName: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    dismissModal: jest.fn(),
}));

jest.mock('@components/team_sidebar/team_list/team_item/team_icon', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(TeamIcon).mockImplementation(
    (props) => React.createElement('TeamIcon', {testID: 'team-icon.mock', ...props}),
);

describe('SelectionTeamBar', () => {
    const mockOnLayoutContainer = jest.fn();
    const mockOnClose = jest.fn().mockResolvedValue(undefined);
    const mockServerDisplayName = 'Test Server';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(useServerDisplayName).mockReturnValue(mockServerDisplayName);
        jest.mocked(Share.open).mockResolvedValue({success: true} as Awaited<ReturnType<typeof Share.open>>);
    });

    function getBaseProps(): ComponentProps<typeof SelectionTeamBar> {
        return {
            teamId: 'team-1',
            teamDisplayName: 'Test Team',
            teamLastIconUpdate: 1234567890,
            teamInviteId: 'invite-id-1',
            serverUrl: 'https://test.server.com',
            onLayoutContainer: mockOnLayoutContainer,
            onClose: mockOnClose,
        };
    }

    it('renders correctly', () => {
        const props = getBaseProps();

        const {getByText, getByTestId} = renderWithIntl(
            <SelectionTeamBar {...props}/>,
        );

        expect(getByText('Test Team')).toBeTruthy();
        expect(getByText(mockServerDisplayName)).toBeTruthy();
        expect(getByText('Share link')).toBeTruthy();
        expect(getByTestId('invite.team_icon')).toBeTruthy();
        expect(getByTestId('invite.share_link.button')).toBeTruthy();
    });

    it('handles share link press', async () => {
        const props = getBaseProps();

        const {getByTestId} = renderWithIntl(
            <SelectionTeamBar {...props}/>,
        );

        const shareButton = getByTestId('invite.share_link.button');
        act(() => {
            fireEvent.press(shareButton);
        });

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled();
            expect(Share.open).toHaveBeenCalled();
        });
    });
});

