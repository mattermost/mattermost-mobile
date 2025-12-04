// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {renderHook} from '@testing-library/react-hooks';

import TestHelper from '@test/test_helper';
import {getUsersByUsername} from '@utils/user';

import {useMemoMentionedUser, useMemoMentionedGroup} from './markdown';

jest.mock('@utils/user', () => ({
    getUsersByUsername: jest.fn(),
}));

const mockGetUsersByUsername = jest.mocked(getUsersByUsername);

describe('useMemoMentionedUser', () => {
    it('should return the mentioned user if found', () => {
        const users = [TestHelper.fakeUserModel({username: 'john_doe'})];
        const mentionName = 'john_doe';
        const usersByUsername = {john_doe: users[0]};
        mockGetUsersByUsername.mockReturnValue(usersByUsername);

        const {result} = renderHook(() => useMemoMentionedUser(users, mentionName));

        expect(result.current).toBe(users[0]);
    });

    it('should return undefined if the mentioned user is not found', () => {
        const users = [TestHelper.fakeUserModel({username: 'john_doe'})];
        const mentionName = 'jane_doe';
        const usersByUsername = {john_doe: users[0]};
        mockGetUsersByUsername.mockReturnValue(usersByUsername);

        const {result} = renderHook(() => useMemoMentionedUser(users, mentionName));

        expect(result.current).toBeUndefined();
    });

    it('should trim trailing punctuation from the mention name', () => {
        const users = [TestHelper.fakeUserModel({username: 'john_doe'})];
        const mentionName = 'john_doe.';
        const usersByUsername = {john_doe: users[0]};
        mockGetUsersByUsername.mockReturnValue(usersByUsername);

        const {result} = renderHook(() => useMemoMentionedUser(users, mentionName));

        expect(result.current).toBe(users[0]);
    });
});

describe('useMemoMentionedGroup', () => {
    it('should return the mentioned group if found', () => {
        const groups = [TestHelper.fakeGroupModel({name: 'developers'})];
        const user = undefined;
        const mentionName = 'developers';

        const {result} = renderHook(() => useMemoMentionedGroup(groups, user, mentionName));

        expect(result.current).toBe(groups[0]);
    });

    it('should return undefined if the mentioned group is not found', () => {
        const groups = [TestHelper.fakeGroupModel({name: 'developers'})];
        const user = undefined;
        const mentionName = 'designers';

        const {result} = renderHook(() => useMemoMentionedGroup(groups, user, mentionName));

        expect(result.current).toBeUndefined();
    });

    it('should return undefined if the user is defined', () => {
        const groups = [TestHelper.fakeGroupModel({name: 'developers'})];
        const user = TestHelper.fakeUserModel({username: 'john_doe'});
        const mentionName = 'developers';

        const {result} = renderHook(() => useMemoMentionedGroup(groups, user, mentionName));

        expect(result.current).toBeUndefined();
    });

    it('should trim trailing punctuation from the mention name', () => {
        const groups = [TestHelper.fakeGroupModel({name: 'developers'})];
        const user = undefined;
        const mentionName = 'developers.';

        const {result} = renderHook(() => useMemoMentionedGroup(groups, user, mentionName));

        expect(result.current).toBe(groups[0]);
    });
});
