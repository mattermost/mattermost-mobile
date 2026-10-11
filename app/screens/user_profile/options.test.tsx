// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {createDirectChannel} from '@actions/remote/channel';
import {ServerErrors} from '@constants';
import {act, fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';
import {alertErrorWithFallback, directMessageFailedMessage} from '@utils/draft';

import UserProfileOptions from './options';

jest.mock('@actions/remote/channel', () => ({
    createDirectChannel: jest.fn(),
    switchToChannelById: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn(),
}));

jest.mock('@utils/draft', () => ({
    ...jest.requireActual('@utils/draft'),
    alertErrorWithFallback: jest.fn(),
}));

describe('screens/user_profile/options', () => {
    const getBaseProps = (): ComponentProps<typeof UserProfileOptions> => ({
        canSendMessage: true,
        type: 'all',
        userId: 'userid2',
        username: 'john',
    });

    it('should offer only mentioning when no direct message may be opened', () => {
        const props = getBaseProps();
        props.canSendMessage = false;
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(<UserProfileOptions {...props}/>);

        expect(queryByTestId('user_profile_options.send_message.option')).toBeNull();
        expect(getByTestId('user_profile_options.mention.option')).toBeTruthy();
    });

    it('should alert when the direct message cannot be opened', async () => {
        const error = {server_error_id: ServerErrors.DM_GM_START_DENIED, status_code: 403, message: 'denied'};
        jest.mocked(createDirectChannel).mockResolvedValue({error});
        const {getByTestId} = renderWithIntlAndTheme(<UserProfileOptions {...getBaseProps()}/>);

        await act(async () => {
            fireEvent.press(getByTestId('user_profile_options.send_message.option'));
        });

        expect(alertErrorWithFallback).toHaveBeenCalledWith(expect.anything(), error, directMessageFailedMessage, {displayName: 'john'});
    });
});
