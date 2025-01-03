// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {renderHook} from '@testing-library/react-hooks';

import {getUsersByUsername} from '@utils/user';

import {useMemoMentionedUser, useMemoMentionedGroup} from './markdown';

import type {GroupModel, UserModel} from '@database/models/server';

jest.mock('@utils/user', () => ({
    getUsersByUsername: jest.fn(),
}));

const mockGetUsersByUsername = jest.mocked(getUsersByUsername);

describe('useMemoMentionedUser', () => {
    it('should return the mentioned user if found', () => {
        const users = [{username: 'john_doe'} as UserModel];
        const mentionName = 'john_doe';
        const usersByUsername = {john_doe: users[0]};
        mockGetUsersByUsername.mockReturnValue(usersByUsername);

        const {result} = renderHook(() => useMemoMentionedUser(users, mentionName));

        expect(result.current).toBe(users[0]);
    });

    it('should return undefined if the mentioned user is not found', () => {
        const users = [{username: 'john_doe'} as UserModel];
        const mentionName = 'jane_doe';
        const usersByUsername = {john_doe: users[0]};
        mockGetUsersByUsername.mockReturnValue(usersByUsername);

        const {result} = renderHook(() => useMemoMentionedUser(users, mentionName));

        expect(result.current).toBeUndefined();
    });

    it('should trim trailing punctuation from the mention name', () => {
        const users = [{username: 'john_doe'} as UserModel];
        const mentionName = 'john_doe.';
        const usersByUsername = {john_doe: users[0]};
        mockGetUsersByUsername.mockReturnValue(usersByUsername);

        const {result} = renderHook(() => useMemoMentionedUser(users, mentionName));

        expect(result.current).toBe(users[0]);
    });
});

describe('useMemoMentionedGroup', () => {
    it('should return the mentioned group if found', () => {
        const groups = [{name: 'developers'} as GroupModel];
        const user = undefined;
        const mentionName = 'developers';

        const {result} = renderHook(() => useMemoMentionedGroup(groups, user, mentionName));

        expect(result.current).toBe(groups[0]);
    });

    it('should return undefined if the mentioned group is not found', () => {
        const groups = [{name: 'developers'} as GroupModel];
        const user = undefined;
        const mentionName = 'designers';

        const {result} = renderHook(() => useMemoMentionedGroup(groups, user, mentionName));

        expect(result.current).toBeUndefined();
    });

    it('should return undefined if the user is defined', () => {
        const groups = [{name: 'developers'} as GroupModel];
        const user = {username: 'john_doe'} as UserModel;
        const mentionName = 'developers';

        const {result} = renderHook(() => useMemoMentionedGroup(groups, user, mentionName));

        expect(result.current).toBeUndefined();
    });

    it('should trim trailing punctuation from the mention name', () => {
        const groups = [{name: 'developers'} as GroupModel];
        const user = undefined;
        const mentionName = 'developers.';

        const {result} = renderHook(() => useMemoMentionedGroup(groups, user, mentionName));

        expect(result.current).toBe(groups[0]);
    });
});
