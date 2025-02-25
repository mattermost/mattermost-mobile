// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import ProfileForm from './form';

import type {CustomAttributeSet} from '@typings/api/custom_profile_attributes';
import type UserModel from '@typings/database/models/servers/user';
import type {UserInfo} from '@typings/screens/edit_profile';

describe('ProfileForm', () => {
    const baseProps = {
        canSave: false,
        currentUser: {
            id: 'user1',
            firstName: 'First',
            lastName: 'Last',
            username: 'username',
            email: 'test@test.com',
            nickname: 'nick',
            position: 'position',
            authService: '',
        } as UserModel,
        isTablet: false,
        lockedFirstName: false,
        lockedLastName: false,
        lockedNickname: false,
        lockedPosition: false,
        onUpdateField: jest.fn(),
        submitUser: jest.fn(),
        userInfo: {
            firstName: 'First',
            lastName: 'Last',
            username: 'username',
            email: 'test@test.com',
            nickname: 'nick',
            position: 'position',
            customAttributes: {},
        } as UserInfo,
        enableCustomAttributes: false,
    };

    it('should render without custom attributes when disabled', () => {
        const {queryByTestId} = renderWithIntl(
            <ProfileForm {...baseProps}/>,
        );

        expect(queryByTestId('edit_profile_form.nickname')).toBeTruthy();
        expect(queryByTestId('edit_profile_form.customAttributes.field1')).toBeNull();
    });

    it('should render custom attributes when enabled', () => {
        const props = {
            ...baseProps,
            enableCustomAttributes: true,
            userInfo: {
                ...baseProps.userInfo,
                customAttributes: {
                    field1: {
                        id: 'field1',
                        name: 'Field 1',
                        value: 'value1',
                    },
                    field2: {
                        id: 'field2',
                        name: 'Field 2',
                        value: 'value2',
                    },
                },
            },
        };

        const {getByTestId} = renderWithIntl(
            <ProfileForm {...props}/>,
        );

        expect(getByTestId('edit_profile_form.nickname')).toBeTruthy();
        expect(getByTestId('edit_profile_form.customAttributes.field1')).toBeTruthy();
        expect(getByTestId('edit_profile_form.customAttributes.field2')).toBeTruthy();
    });

    it('should call onUpdateField when custom attribute is changed', () => {
        const onUpdateField = jest.fn();
        const props = {
            ...baseProps,
            enableCustomAttributes: true,
            onUpdateField,
            userInfo: {
                ...baseProps.userInfo,
                customAttributes: {
                    field1: {
                        id: 'field1',
                        name: 'Field 1',
                        value: 'value1',
                    },
                },
            },
        };

        const {getByTestId} = renderWithIntl(
            <ProfileForm {...props}/>,
        );

        const input = getByTestId('edit_profile_form.customAttributes.field1.input');
        fireEvent.changeText(input, 'new value');

        expect(onUpdateField).toHaveBeenCalledWith('customAttributes.field1', 'new value');
    });

    it('should handle empty custom attributes', () => {
        const props = {
            ...baseProps,
            enableCustomAttributes: true,
            userInfo: {
                ...baseProps.userInfo,
                customAttributes: {},
            },
        };

        const {queryByTestId} = renderWithIntl(
            <ProfileForm {...props}/>,
        );

        expect(queryByTestId('edit_profile_form.customAttributes.field1')).toBeNull();
    });

    test('should maintain custom attributes sort order', () => {
        const customAttributes: CustomAttributeSet = {
            attr1: {
                id: 'attr1',
                name: 'Department',
                value: 'Engineering',
                sort_order: 1,
            },
            attr2: {
                id: 'attr2',
                name: 'Location',
                value: 'Remote',
                sort_order: 0,
            },
            attr3: {
                id: 'attr3',
                name: 'Start Date',
                value: '2023',
                sort_order: 2,
            },
        };

        const props = {
            ...baseProps,
            enableCustomAttributes: true,
            userInfo: {
                ...baseProps.userInfo,
                customAttributes,
            },
        };

        const {getAllByTestId} = renderWithIntl(
            <ProfileForm
                {...props}
            />,
        );

        const attributeFields = getAllByTestId(/^edit_profile_form.customAttributes\.attr\d$/);

        // Verify fields are rendered in sort order
        expect(attributeFields[0].props.testID).toBe('edit_profile_form.customAttributes.attr2'); // sort_order: 0
        expect(attributeFields[1].props.testID).toBe('edit_profile_form.customAttributes.attr1'); // sort_order: 1
        expect(attributeFields[2].props.testID).toBe('edit_profile_form.customAttributes.attr3'); // sort_order: 2
    });
});
