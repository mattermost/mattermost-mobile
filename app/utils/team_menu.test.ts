// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, type AlertButton} from 'react-native';

import {removeCurrentUserFromTeam} from '@actions/remote/team';
import {Screens} from '@constants';
import {navigateToScreen} from '@screens/navigation';

import {confirmLeaveTeam, openJoinTeamModal} from './team_menu';

import type {IntlShape} from 'react-intl';

jest.mock('@actions/remote/team', () => ({
    removeCurrentUserFromTeam: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    navigateToScreen: jest.fn(),
}));

jest.mock('@components/compass_icon', () => ({
    __esModule: true,
    default: {
        getImageSourceSync: jest.fn(() => ({uri: 'icon'})),
    },
}));

const mockIntl = {
    formatMessage: ({defaultMessage}: {defaultMessage: string}, values?: Record<string, string>) => {
        if (!values) {
            return defaultMessage;
        }
        return Object.entries(values).reduce(
            (msg, [key, value]) => msg.replace(`{${key}}`, value),
            defaultMessage,
        );
    },
} as unknown as IntlShape;

describe('openJoinTeamModal', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows the JoinTeam modal with a close button', () => {
        openJoinTeamModal();

        expect(navigateToScreen).toHaveBeenCalledTimes(1);
        const [screen] = (navigateToScreen as jest.Mock).mock.calls[0];
        expect(screen).toBe(Screens.JOIN_TEAM);
    });
});

describe('confirmLeaveTeam', () => {
    let alertSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    });

    afterEach(() => {
        alertSpy.mockRestore();
    });

    it('shows a confirmation alert with the team name in the title', () => {
        confirmLeaveTeam(mockIntl, 'http://server', 'team-id', 'My Team');

        expect(alertSpy).toHaveBeenCalledTimes(1);
        const [title, body] = alertSpy.mock.calls[0];
        expect(title).toBe('Leave My Team?');
        expect(body).toBe("You'll need to be invited or join again to come back.");
    });

    it('does not call removeCurrentUserFromTeam when the user cancels', () => {
        confirmLeaveTeam(mockIntl, 'http://server', 'team-id', 'My Team');

        const buttons = alertSpy.mock.calls[0][2] as AlertButton[];
        const cancelButton = buttons.find((b) => b.style === 'cancel');
        expect(cancelButton).toBeDefined();
        cancelButton?.onPress?.();

        expect(removeCurrentUserFromTeam).not.toHaveBeenCalled();
    });

    it('calls removeCurrentUserFromTeam when the user confirms', () => {
        confirmLeaveTeam(mockIntl, 'http://server', 'team-id', 'My Team');

        const buttons = alertSpy.mock.calls[0][2] as AlertButton[];
        const leaveButton = buttons.find((b) => b.style === 'destructive');
        expect(leaveButton).toBeDefined();
        leaveButton?.onPress?.();

        expect(removeCurrentUserFromTeam).toHaveBeenCalledWith('http://server', 'team-id');
    });
});
