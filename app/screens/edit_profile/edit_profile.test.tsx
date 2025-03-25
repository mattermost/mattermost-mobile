// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {act} from '@testing-library/react-hooks';
import {fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';

import AvailableScreens from '@constants/screens';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import EditProfile from './edit_profile';

import type {UserModel} from '@database/models/server';

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

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn().mockReturnValue('http://localhost:8065'),
}));

jest.mock('@actions/remote/user', () => ({
    fetchCustomAttributes: jest.fn().mockResolvedValue({
        attributes: {
            attr1: {
                id: 'attr1',
                name: 'Custom Attribute 1',
                value: 'original value 1',
                sort_order: 1,
            },
            attr3: {
                id: 'attr3',
                name: 'Custom Attribute 3',
                value: 'original value 3',
                sort_order: 3,
            },
            attr2: {
                id: 'attr2',
                name: 'Custom Attribute 2',
                value: 'original value 2',
                sort_order: 2,
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
        const {findAllByTestId} = renderWithIntlAndTheme(
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

        await waitFor(() => {
            const {fetchCustomAttributes} = require('@actions/remote/user');
            expect(fetchCustomAttributes).toHaveBeenCalledWith('http://localhost:8065', 'user1');
        });

        const customAttributeItems = await findAllByTestId(new RegExp('^edit_profile_form.customAttributes.attr[0-9]+.input$'));
        expect(customAttributeItems.length).toBe(3);

        expect(customAttributeItems[0].props.value).toBe('original value 1');
        expect(customAttributeItems[1].props.value).toBe('original value 2');
        expect(customAttributeItems[2].props.value).toBe('original value 3');

        await act(async () => {
            fireEvent.changeText(customAttributeItems[1], 'new value');
        });

        const newCustomAttributeItems = await findAllByTestId(new RegExp('^edit_profile_form.customAttributes.attr[0-9]+.input$'));
        expect(newCustomAttributeItems.length).toBe(3);
        expect(newCustomAttributeItems[0].props.value).toBe('original value 1');
        expect(newCustomAttributeItems[1].props.value).toBe('new value');
        expect(newCustomAttributeItems[2].props.value).toBe('original value 3');
    });
});
