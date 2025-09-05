// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ProfileForm from './form';

import type {CustomAttributeSet} from '@typings/api/custom_profile_attributes';

// Mock AutocompleteSelector to avoid database dependency
jest.mock('@components/autocomplete_selector', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const MockAutocompleteSelector = jest.requireMock('@components/autocomplete_selector').default;
MockAutocompleteSelector.mockImplementation((props: any) =>
    React.createElement('AutocompleteSelector', {...props}),
);

describe('ProfileForm', () => {
    const baseProps: ComponentProps<typeof ProfileForm> = {
        canSave: false,
        currentUser: TestHelper.fakeUserModel({
            id: 'user1',
            firstName: 'First',
            lastName: 'Last',
            username: 'username',
            email: 'test@test.com',
            nickname: 'nick',
            position: 'position',
            authService: '',
        }),
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
        },
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
                        type: 'text',
                        value: 'value1',
                    },
                    field2: {
                        id: 'field2',
                        name: 'Field 2',
                        type: 'text',
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
                        type: 'text',
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
                type: 'text',
            },
            attr2: {
                id: 'attr2',
                name: 'Location',
                value: 'Remote',
                sort_order: 0,
                type: 'text',
            },
            attr3: {
                id: 'attr3',
                name: 'Start Date',
                value: '2023',
                sort_order: 2,
                type: 'text',
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

    it('should render SelectField for select type custom attributes', () => {
        const customFields = [
            TestHelper.fakeCustomProfileFieldModel({
                id: 'department',
                name: 'Department',
                type: 'select',
                attrs: {
                    options: [
                        {id: 'eng', name: 'Engineering'},
                        {id: 'mkt', name: 'Marketing'},
                        {id: 'sales', name: 'Sales'},
                    ],
                },
            }),
        ];

        const props = {
            ...baseProps,
            enableCustomAttributes: true,
            customFields,
            userInfo: {
                ...baseProps.userInfo,
                customAttributes: {
                    department: {
                        id: 'department',
                        name: 'Department',
                        type: 'select',
                        value: 'eng',
                    },
                },
            },
        };

        renderWithIntl(
            <ProfileForm {...props}/>,
        );

        expect(screen.getByTestId('edit_profile_form.customAttributes.department')).toBeTruthy();
    });

    it('should render SelectField for multiselect type custom attributes', () => {
        const customFields = [
            TestHelper.fakeCustomProfileFieldModel({
                id: 'skills',
                name: 'Skills',
                type: 'multiselect',
                attrs: {
                    options: [
                        {id: 'js', name: 'JavaScript'},
                        {id: 'react', name: 'React'},
                        {id: 'ts', name: 'TypeScript'},
                    ],
                },
            }),
        ];

        const props = {
            ...baseProps,
            enableCustomAttributes: true,
            customFields,
            userInfo: {
                ...baseProps.userInfo,
                customAttributes: {
                    skills: {
                        id: 'skills',
                        name: 'Skills',
                        type: 'multiselect',
                        value: 'js,react',
                    },
                },
            },
        };

        renderWithIntl(
            <ProfileForm {...props}/>,
        );

        expect(screen.getByTestId('edit_profile_form.customAttributes.skills')).toBeTruthy();
    });

    it('should render SelectField for select type custom attributes with correct value', () => {
        const customFields = [
            TestHelper.fakeCustomProfileFieldModel({
                id: 'department',
                name: 'Department',
                type: 'select',
                attrs: {
                    options: [
                        {id: 'eng', name: 'Engineering'},
                        {id: 'mkt', name: 'Marketing'},
                    ],
                },
            }),
        ];

        const props = {
            ...baseProps,
            enableCustomAttributes: true,
            customFields,
            userInfo: {
                ...baseProps.userInfo,
                customAttributes: {
                    department: {
                        id: 'department',
                        name: 'Department',
                        type: 'select',
                        value: 'eng',
                    },
                },
            },
        };

        renderWithIntl(
            <ProfileForm {...props}/>,
        );

        // Verify that the SelectField is rendered with the correct testID
        expect(screen.getByTestId('edit_profile_form.customAttributes.department')).toBeTruthy();
    });

    it('should render SelectField for multiselect type custom attributes with correct value', () => {
        const customFields = [
            TestHelper.fakeCustomProfileFieldModel({
                id: 'skills',
                name: 'Skills',
                type: 'multiselect',
                attrs: {
                    options: [
                        {id: 'js', name: 'JavaScript'},
                        {id: 'react', name: 'React'},
                        {id: 'ts', name: 'TypeScript'},
                    ],
                },
            }),
        ];

        const props = {
            ...baseProps,
            enableCustomAttributes: true,
            customFields,
            userInfo: {
                ...baseProps.userInfo,
                customAttributes: {
                    skills: {
                        id: 'skills',
                        name: 'Skills',
                        type: 'multiselect',
                        value: 'js',
                    },
                },
            },
        };

        renderWithIntl(
            <ProfileForm {...props}/>,
        );

        // Verify that the SelectField is rendered with the correct testID
        expect(screen.getByTestId('edit_profile_form.customAttributes.skills')).toBeTruthy();
    });

    it('should render text field for custom attributes without field definition', () => {
        const props = {
            ...baseProps,
            enableCustomAttributes: true,
            customFields: [], // No field definitions
            userInfo: {
                ...baseProps.userInfo,
                customAttributes: {
                    unknownField: {
                        id: 'unknownField',
                        name: 'Unknown Field',
                        type: 'text',
                        value: 'some value',
                    },
                },
            },
        };

        renderWithIntl(
            <ProfileForm {...props}/>,
        );

        // Should render as text field since no field definition exists
        expect(screen.getByTestId('edit_profile_form.customAttributes.unknownField')).toBeTruthy();
    });

    it('should render text field for custom attributes with unsupported type', () => {
        const customFields = [
            TestHelper.fakeCustomProfileFieldModel({
                id: 'customField',
                name: 'Custom Field',
                type: 'unsupported_type',
                attrs: {},
            }),
        ];

        const props = {
            ...baseProps,
            enableCustomAttributes: true,
            customFields,
            userInfo: {
                ...baseProps.userInfo,
                customAttributes: {
                    customField: {
                        id: 'customField',
                        name: 'Custom Field',
                        type: 'unsupported_type',
                        value: 'some value',
                    },
                },
            },
        };

        renderWithIntl(
            <ProfileForm {...props}/>,
        );

        // Should render as text field for unsupported types
        expect(screen.getByTestId('edit_profile_form.customAttributes.customField')).toBeTruthy();
    });

    it('should render ProfileForm without errors when custom fields have no field definitions', () => {
        const props = {
            ...baseProps,
            enableCustomAttributes: true,
            customFields: [], // No field definitions
            userInfo: {
                ...baseProps.userInfo,
                customAttributes: {
                    unknownField: {
                        id: 'unknownField',
                        name: 'Unknown Field',
                        type: 'text',
                        value: 'some value',
                    },
                },
            },
        };

        const {getByTestId} = renderWithIntl(
            <ProfileForm {...props}/>,
        );

        // Should render as a text field since no field definition exists
        expect(getByTestId('edit_profile_form.customAttributes.unknownField')).toBeTruthy();
    });
});
