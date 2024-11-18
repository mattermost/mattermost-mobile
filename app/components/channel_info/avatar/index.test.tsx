// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {render} from '@testing-library/react-native';
import React from 'react';

import Avatar from './';

import type UserModel from '@typings/database/models/servers/user';

jest.mock('@actions/remote/user', () => ({
    buildProfileImageUrlFromUser: jest.fn(),
}));

jest.mock('@actions/remote/file', () => ({
    buildAbsoluteUrl: jest.fn(),
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(),
}));

const mockBuildAbsoluteUrl = require('@actions/remote/file').buildAbsoluteUrl;
const mockBuildProfileImageUrlFromUser = require('@actions/remote/user').buildProfileImageUrlFromUser;
const mockUseServerUrl = require('@context/server').useServerUrl;

describe('Avatar Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the avatar image when URI is available', () => {
        const mockServerUrl = 'base.url.com';
        const mockUri = '/api/v4/users/mock-user-id/image';
        const mockAuthor = {id: 'mock-user-id'} as UserModel;

        mockUseServerUrl.mockReturnValue(mockServerUrl);
        mockBuildProfileImageUrlFromUser.mockImplementation((_: string, author: UserModel) => {
            return author ? mockUri : '';
        });
        mockBuildAbsoluteUrl.mockImplementation((serverUrl: string, uri: string) => `${serverUrl}${uri}`);

        const {queryByTestId} = render(<Avatar author={mockAuthor}/>);

        expect(mockBuildProfileImageUrlFromUser).toHaveBeenCalledWith(mockServerUrl, mockAuthor);
        expect(mockBuildAbsoluteUrl).toHaveBeenCalledWith(mockServerUrl, mockUri);

        expect(queryByTestId('avatar-icon')).toBeNull();
    });

    it('renders the fallback icon when URI is not available', () => {
        const mockServerUrl = 'base.url.com';
        const mockAuthor = {id: 'mock-user-id'} as UserModel;

        mockUseServerUrl.mockReturnValue(mockServerUrl);
        mockBuildProfileImageUrlFromUser.mockReturnValue('');
        mockBuildAbsoluteUrl.mockReturnValue('');

        const {getByTestId, queryByTestId} = render(<Avatar author={mockAuthor}/>);

        expect(mockBuildProfileImageUrlFromUser).toHaveBeenCalledWith(mockServerUrl, mockAuthor);
        expect(mockBuildAbsoluteUrl).not.toHaveBeenCalled();

        const icon = getByTestId('avatar-icon');
        expect(icon.props.name).toBe('account-outline');
        expect(queryByTestId('avatar-image')).toBeNull();
    });

    it('renders the fallback icon when author is not provided', () => {
        const mockServerUrl = 'base.url.com';

        mockUseServerUrl.mockReturnValue(mockServerUrl);

        const {getByTestId, queryByTestId} = render(<Avatar author={null as unknown as UserModel}/>);

        expect(mockBuildProfileImageUrlFromUser).not.toHaveBeenCalled();
        expect(mockBuildAbsoluteUrl).not.toHaveBeenCalled();

        const icon = getByTestId('avatar-icon');
        expect(icon.props.name).toBe('account-outline');
        expect(queryByTestId('avatar-image')).toBeNull();
    });
});
