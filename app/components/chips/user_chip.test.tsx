// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import ProfilePicture from '@components/profile_picture';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import BaseChip from './base_chip';
import UserChip from './user_chip';

jest.mock('./base_chip', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(BaseChip).mockImplementation((props) => React.createElement('BaseChip', {...props}));

jest.mock('@components/profile_picture', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ProfilePicture).mockImplementation((props) => React.createElement('ProfilePicture', {...props}));

describe('UserChip', () => {
    const mockOnPress = jest.fn();
    const mockOnActionPress = jest.fn();
    const mockUser = TestHelper.fakeUser({id: 'user-id', username: 'test-user'});

    it('should render with the correct props', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <UserChip
                user={mockUser}
                onPress={mockOnPress}
                testID='user-chip'
                teammateNameDisplay='username'
                showAnimation={true}
                action={{icon: 'remove', onPress: mockOnActionPress}}
            />,
        );

        const baseChip = getByTestId('user-chip');
        expect(baseChip.props.label).toBe('test-user');
        expect(baseChip.props.action).toEqual({icon: 'remove', onPress: expect.any(Function)});
        expect(baseChip.props.showAnimation).toBe(true);

        expect(baseChip.props.prefix).toBeDefined();
        const profilePicture = baseChip.props.prefix;
        expect(profilePicture.props.author).toBe(mockUser);
        expect(profilePicture.props.size).toBe(20);
        expect(profilePicture.props.iconSize).toBe(20);
        expect(profilePicture.props.testID).toBe('user-chip.profile_picture');

        baseChip.props.onPress();
        expect(mockOnPress).toHaveBeenCalledTimes(1);
        expect(mockOnPress).toHaveBeenCalledWith('user-id');
        expect(mockOnActionPress).not.toHaveBeenCalled();

        mockOnPress.mockClear();

        baseChip.props.action.onPress();
        expect(mockOnActionPress).toHaveBeenCalledTimes(1);
        expect(mockOnActionPress).toHaveBeenCalledWith('user-id');
        expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should leave action onPress undefined when action with no onPress is provided', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <UserChip
                user={mockUser}
                onPress={mockOnPress}
                teammateNameDisplay='username'
                action={{icon: 'remove'}}
                testID='user-chip'
            />,
        );

        const baseChip = getByTestId('user-chip');
        expect(baseChip.props.action.onPress).toBeUndefined();
    });

    it('should leave onPress undefined when onPress is not provided', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <UserChip
                user={mockUser}
                teammateNameDisplay='username'
                action={{icon: 'remove', onPress: mockOnActionPress}}
                testID='user-chip'
            />,
        );

        const baseChip = getByTestId('user-chip');
        expect(baseChip.props.onPress).toBeUndefined();
    });
});
