// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render} from '@testing-library/react-native';
import React from 'react';

import TestHelper from '@test/test_helper';

import SelectedUserChip from './selected_user_chip';
import UserChip from './user_chip';

jest.mock('./user_chip', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(UserChip).mockImplementation((props) => React.createElement('UserChip', {...props}));

describe('SelectedUserChip', () => {
    const mockOnPress = jest.fn();
    const mockUser = TestHelper.fakeUser({id: 'user-id', username: 'test-user'});

    it('should render with the correct props', () => {
        const {getByTestId} = render(
            <SelectedUserChip
                user={mockUser}
                onPress={mockOnPress}
                testID='selected-user-chip'
                teammateNameDisplay='username'
            />,
        );

        const userChip = getByTestId('selected-user-chip');
        expect(userChip.props.user).toBe(mockUser);
        expect(userChip.props.teammateNameDisplay).toBe('username');
        expect(userChip.props.showRemoveOption).toBe(true);
        expect(userChip.props.showAnimation).toBe(true);
        userChip.props.onPress();
        expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
});
