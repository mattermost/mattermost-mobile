// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import ProfileForm from './form';

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
});
