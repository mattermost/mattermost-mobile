// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {render} from '@testing-library/react-native';
import React from 'react';

import {buildProfileImageUrlFromUser} from '@actions/remote/user';

import Avatar from './';

import type UserModel from '@typings/database/models/servers/user';

jest.mock('@actions/remote/user', () => ({
    buildProfileImageUrlFromUser: jest.fn(),
}));

jest.mock('@actions/remote/file', () => ({
    buildAbsoluteUrl: (serverUrl: string, uri: string) => `${serverUrl}${uri}`,
}));

jest.mock('@utils/theme', () => ({
    changeOpacity: (color: string, opacity: number) => `rgba(${color}, ${opacity})`,
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(),
}));

describe('Avatar Component', () => {
    const mockServerUrl = 'mock.server.url';
    const mockAuthor = {
        id: 'user123',
        username: 'testuser',
        email: 'testuser@example.com',
        firstName: 'Test',
        lastName: 'User',
        nickname: 'test',
        locale: 'en',
        lastPictureUpdate: 123456789,
        updateAt: 123456789,
        deleteAt: 0,
    } as UserModel;

    beforeEach(() => {
        jest.resetAllMocks();
        require('@context/server').useServerUrl.mockReturnValue(mockServerUrl);
    });

    it('renders the user profile image if available', () => {
        (buildProfileImageUrlFromUser as jest.Mock).mockReturnValue('/profile/image/url');

        const {getByTestId} = render(
            <Avatar author={mockAuthor}/>,
        );

        const image = getByTestId('avatar-image');
        expect(image.props.source).toEqual({uri: `${mockServerUrl}/profile/image/url`});
    });

    it('renders the default icon if profile image URL is not available', () => {
        (buildProfileImageUrlFromUser as jest.Mock).mockReturnValue('');

        const {getByTestId} = render(
            <Avatar author={mockAuthor}/>,
        );

        const icon = getByTestId('avatar-icon');
        expect(icon.props.name).toBe('account-outline');
    });
});
