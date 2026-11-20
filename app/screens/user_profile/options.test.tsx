// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, render, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps, type ReactElement} from 'react';

import {createDirectChannel} from '@actions/remote/channel';
import {joinCallAndOpenCallScreen} from '@calls/actions/calls';
import {isPhoneDialingAvailable} from '@calls/state';
import {useServerUrl} from '@context/server';
import {bottomSheet} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import UserProfileOptions from './options';

jest.mock('@actions/remote/channel');
jest.mock('@calls/actions/calls');
jest.mock('@calls/alerts');
jest.mock('@calls/state');
jest.mock('@context/server');
jest.mock('@screens/navigation');

const serverUrl = 'server1';
jest.mocked(useServerUrl).mockReturnValue(serverUrl);

describe('UserProfileOptions', () => {
    const baseProps: ComponentProps<typeof UserProfileOptions> = {
        type: 'all',
        userId: 'user-2',
        username: 'leonard',
        phones: [{label: 'Mobile', number: '+15551234567'}],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(isPhoneDialingAvailable).mockReturnValue(true);
        jest.mocked(createDirectChannel).mockResolvedValue({data: {id: 'dm-channel'} as Channel});
    });

    it('should start a Mattermost call in the DM from the profile\'s call options', async () => {
        const {getByTestId} = renderWithIntlAndTheme(<UserProfileOptions {...baseProps}/>);

        fireEvent.press(getByTestId('user_profile_options.call.option'));
        await waitFor(() => expect(bottomSheet).toHaveBeenCalled());

        const sheet = render(jest.mocked(bottomSheet).mock.calls[0][0]() as ReactElement);
        fireEvent.press(sheet.getByTestId('user_call_options.start_call'));

        await waitFor(() => {
            expect(joinCallAndOpenCallScreen).toHaveBeenCalledWith(expect.anything(), serverUrl, 'dm-channel');
        });
    });

    it('should hide the call option when the user has no phone numbers', () => {
        const {queryByTestId} = renderWithIntlAndTheme(
            <UserProfileOptions
                {...baseProps}
                phones={[]}
            />,
        );

        expect(queryByTestId('user_profile_options.call.option')).toBeNull();
    });
});
