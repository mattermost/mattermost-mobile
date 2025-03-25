// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {act} from '@testing-library/react-hooks';
import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import AvailableScreens from '@constants/screens';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import EditProfile from './edit_profile';

import type {UserModel} from '@database/models/server';

// Mock CompassIcon
jest.mock('@components/compass_icon', () => {
    function CompassIcon() {
        return null;
    }
    CompassIcon.getImageSourceSync = jest.fn().mockReturnValue({});
    return {
        __esModule: true,
        default: CompassIcon,
    };
});

// Mock server context
jest.mock('@context/server', () => ({
    useServerUrl: jest.fn().mockReturnValue('http://localhost:8065'),
}));

// Mock remote user actions
jest.mock('@actions/remote/user', () => ({
    fetchCustomAttributes: jest.fn().mockResolvedValue({
        attributes: {
            attr1: {
                id: 'attr1',
                name: 'Custom Attribute 1',
                value: 'original value',
                sort_order: 1,
            },
        },
        error: undefined,
    }),
    updateCustomAttributes: jest.fn().mockResolvedValue({}),
    updateMe: jest.fn().mockResolvedValue({}),
    uploadUserProfileImage: jest.fn().mockResolvedValue({}),
    setDefaultProfileImage: jest.fn().mockResolvedValue({}),
    buildProfileImageUrlFromUser: jest.fn().mockReturnValue('http://example.com/profile.jpg'),
}));

describe('EditProfile', () => {
    const mockCurrentUser = {
        id: 'user1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        nickname: 'Johnny',
        position: 'Developer',
        username: 'johndoe',
    } as UserModel;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should update custom attribute value while preserving name and sort order', async () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <EditProfile
                componentId={AvailableScreens.EDIT_PROFILE}
                currentUser={mockCurrentUser}
                isModal={false}
                isTablet={false}
                lockedFirstName={false}
                lockedLastName={false}
                lockedNickname={false}
                lockedPosition={false}
                lockedPicture={false}
                enableCustomAttributes={true}
            />,
        );

        // Wait for the custom attributes to be loaded
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        // Verify the mock was called with correct arguments
        const {fetchCustomAttributes} = require('@actions/remote/user');
        expect(fetchCustomAttributes).toHaveBeenCalledWith('http://localhost:8065', 'user1');
        const TEST_ID = 'edit_profile_form.customAttributes.attr1.input';

        // Find the input field and update its value
        const input = getByTestId(TEST_ID);

        await act(async () => {
            fireEvent.changeText(input, 'new value');
        });

        const updatedCustomAttr = getByTestId(TEST_ID);

        // Verify the value was updated
        expect(updatedCustomAttr.props.value).toBe('new value');

        // Verify name and sort_order were preserved
        expect(updatedCustomAttr.props.name).toBe(input.props.name);
        expect(updatedCustomAttr.props.sort_order).toBe(input.props.sort_order);
    });
});
