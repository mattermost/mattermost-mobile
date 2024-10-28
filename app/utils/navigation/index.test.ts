// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createIntl} from 'react-intl';
import {Alert} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {ServerErrors} from '@constants';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';

import {mergeNavigationOptions, alertTeamRemove, alertChannelRemove, alertChannelArchived, alertTeamAddError} from '.';

describe('Navigation utils', () => {
    const componentId = 'component-id';
    const options = {topBar: {title: {text: 'Test'}}};
    const displayName = 'Test Display Name';
    const serverError = {server_error_id: ServerErrors.TEAM_MEMBERSHIP_DENIAL_ERROR_ID};
    const genericServerError = {server_error_id: 'api.some_server_error.id', message: 'Generic error message'};
    const intl = createIntl({locale: DEFAULT_LOCALE, messages: getTranslations(DEFAULT_LOCALE)});

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should call Navigation.mergeOptions with the correct arguments', () => {
        mergeNavigationOptions(componentId, options);
        expect(Navigation.mergeOptions).toHaveBeenCalledWith(componentId, options);
    });

    it('should display alert when a user is removed from a team', () => {
        alertTeamRemove(displayName, intl);
        expect(Alert.alert).toHaveBeenCalledWith(
            'Removed from team',
            'You have been removed from team Test Display Name.',
            [{style: 'cancel', text: 'OK'}],
        );
    });

    it('should display alert when a user is removed from a channel', () => {
        alertChannelRemove(displayName, intl);
        expect(Alert.alert).toHaveBeenCalledWith(
            'Removed from channel',
            'You have been removed from channel Test Display Name.',
            [{style: 'cancel', text: 'OK'}],
        );
    });

    it('should display alert when a channel is archived', () => {
        alertChannelArchived(displayName, intl);
        expect(Alert.alert).toHaveBeenCalledWith(
            'Archived channel',
            'The channel Test Display Name has been archived.',
            [{style: 'cancel', text: 'OK'}],
        );
    });

    it('should display alert for team add error with default message', () => {
        alertTeamAddError({}, intl);
        expect(Alert.alert).toHaveBeenCalledWith(
            'Error joining a team',
            'There has been an error joining the team',
        );
    });

    it('should display alert for team add error with specific server error message', () => {
        alertTeamAddError(serverError, intl);
        expect(Alert.alert).toHaveBeenCalledWith(
            'Error joining a team',
            'You need to be a member of a linked group to join this team.',
        );
    });

    it('should display alert for team add error with generic error message', () => {
        alertTeamAddError(genericServerError, intl);
        expect(Alert.alert).toHaveBeenCalledWith(
            'Error joining a team',
            'Generic error message',
        );
    });
});
