// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render} from '@testing-library/react-native';
import React from 'react';
import {IntlProvider} from 'react-intl';

import {getTranslations} from '@i18n';
import {InteractiveDialogAdapter} from '@utils/interactive_dialog_adapter';

import {DialogRouter} from './dialog_router';

// Mock dependencies
jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(),
}));

jest.mock('@screens/apps_form/apps_form_component', () => {
    const mockReact = require('react');
    return jest.fn(({testID}) => mockReact.createElement('View', {testID: testID || 'apps-form-component'}));
});

jest.mock('@actions/remote/integrations', () => ({
    submitInteractiveDialog: jest.fn(),
}));

jest.mock('@utils/interactive_dialog_adapter');

const mockSubmitInteractiveDialog = require('@actions/remote/integrations').submitInteractiveDialog;
const mockUseServerUrl = require('@context/server').useServerUrl;
const mockAppsFormComponent = require('@screens/apps_form/apps_form_component');
const mockInteractiveDialogAdapter = InteractiveDialogAdapter as jest.Mocked<typeof InteractiveDialogAdapter>;

// Test helper to render with internationalization
function renderWithIntl(ui: React.ReactElement) {
    return render(
        <IntlProvider
            locale='en'
            messages={getTranslations('en')}
        >
            {ui}
        </IntlProvider>,
    );
}

describe('DialogRouter', () => {
    const mockServerUrl = 'https://test.mattermost.com';
    const mockConfig: InteractiveDialogConfig = {
        app_id: 'test-app',
        dialog: {
            callback_id: 'test-callback',
            title: 'Test Dialog',
            introduction_text: 'Test introduction',
            elements: [
                {
                    name: 'test_field',
                    type: 'text',
                    display_name: 'Test Field',
                    optional: false,
                    default: '',
                    placeholder: 'Enter text',
                    help_text: 'Help text',
                    min_length: 0,
                    max_length: 100,
                    data_source: '',
                    options: [],
                },
            ],
            submit_label: 'Submit',
            state: '',
            notify_on_cancel: false,
        },
        url: 'https://test.com/dialog',
        trigger_id: 'test-trigger-id',
    };

    const mockAppForm: AppForm = {
        title: 'Test Dialog',
        header: 'Test introduction',
        fields: [
            {
                name: 'test_field',
                type: 'text',
                is_required: true,
                label: 'Test Field',
                description: 'Help text',
                position: 0,
                hint: 'Enter text',
                max_length: 100,
                min_length: 0,
            },
        ],
        submit: {
            path: '/dialog/submit',
            expand: {},
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseServerUrl.mockReturnValue(mockServerUrl);
        mockInteractiveDialogAdapter.convertToAppForm.mockReturnValue(mockAppForm);
        mockInteractiveDialogAdapter.createSubmitHandler.mockReturnValue(jest.fn());
        mockInteractiveDialogAdapter.convertValuesToSubmission.mockReturnValue({
            url: 'test-url',
            callback_id: 'test-callback',
            state: 'test-state',
            submission: {},
            user_id: '',
            channel_id: '',
            team_id: '',
            cancelled: false,
        });
        mockSubmitInteractiveDialog.mockResolvedValue({
            data: {type: 'ok'},
        });
    });

    it('should render AppsFormComponent when conversion succeeds', () => {
        const {getByTestId} = renderWithIntl(
            <DialogRouter config={mockConfig}/>,
        );

        expect(getByTestId('apps-form-component')).toBeTruthy();
        expect(mockAppsFormComponent).toHaveBeenCalledWith({
            form: mockAppForm,
            submit: expect.any(Function),
            performLookupCall: expect.any(Function),
            refreshOnSelect: expect.any(Function),
        }, undefined);
    });

    it('should call dialog conversion with correct config', () => {
        renderWithIntl(<DialogRouter config={mockConfig}/>);

        expect(mockInteractiveDialogAdapter.convertToAppForm).toHaveBeenCalledWith(mockConfig);
    });

    it('should create submit handler with correct parameters', () => {
        renderWithIntl(<DialogRouter config={mockConfig}/>);

        // Submit handler is created when handleSubmit callback is used
        const submitHandler = mockAppsFormComponent.mock.calls[0][0].submit;
        expect(typeof submitHandler).toBe('function');
    });

    it('should render nothing when conversion fails', () => {
        mockInteractiveDialogAdapter.convertToAppForm.mockImplementation(() => {
            throw new Error('Conversion failed');
        });

        const {queryByTestId} = renderWithIntl(
            <DialogRouter config={mockConfig}/>,
        );

        expect(queryByTestId('apps-form-component')).toBeNull();
    });

    it('should render nothing when converted form has no fields', () => {
        mockInteractiveDialogAdapter.convertToAppForm.mockReturnValue({
            ...mockAppForm,
            fields: undefined,
        });

        const {queryByTestId} = renderWithIntl(
            <DialogRouter config={mockConfig}/>,
        );

        expect(queryByTestId('apps-form-component')).toBeNull();
    });

    it('should render AppsForm when converted form has empty fields array', () => {
        mockInteractiveDialogAdapter.convertToAppForm.mockReturnValue({
            ...mockAppForm,
            fields: [],
        });

        const {getByTestId} = renderWithIntl(
            <DialogRouter config={mockConfig}/>,
        );

        // Component should still render AppsForm even with empty fields
        // The DialogRouter only checks for fields existence, not if it's empty
        expect(getByTestId('apps-form-component')).toBeTruthy();
    });

    describe('stub action handlers', () => {
        it('should provide performLookupCall that returns empty items', async () => {
            renderWithIntl(<DialogRouter config={mockConfig}/>);

            const performLookupCall = mockAppsFormComponent.mock.calls[0][0].performLookupCall;
            const mockField = {name: 'test_field'} as AppField;
            const mockValues = {} as AppFormValues;
            const mockUserInput = 'test' as AppFormValue;
            const result = await performLookupCall(mockField, mockValues, mockUserInput);

            expect(result).toEqual({
                data: {
                    type: 'ok',
                    data: {
                        items: [],
                    },
                },
            });
        });

        it('should provide refreshOnSelect that returns ok response', async () => {
            renderWithIntl(<DialogRouter config={mockConfig}/>);

            const refreshOnSelect = mockAppsFormComponent.mock.calls[0][0].refreshOnSelect;
            const mockField = {name: 'test_field'} as AppField;
            const mockValues = {} as AppFormValues;
            const result = await refreshOnSelect(mockField, mockValues);

            expect(result).toEqual({
                data: {
                    type: 'ok',
                },
            });
        });
    });

    describe('React.memo optimization', () => {
        it('should not re-render when props are unchanged', () => {
            const {rerender} = renderWithIntl(
                <DialogRouter config={mockConfig}/>,
            );

            const initialCallCount = mockAppsFormComponent.mock.calls.length;

            // Re-render with same props
            rerender(
                <IntlProvider
                    locale='en'
                    messages={getTranslations('en')}
                >
                    <DialogRouter config={mockConfig}/>
                </IntlProvider>,
            );

            // Should not have called AppsFormComponent again
            expect(mockAppsFormComponent.mock.calls.length).toBe(initialCallCount);
        });

        it('should re-render when config changes', () => {
            const {rerender} = renderWithIntl(
                <DialogRouter config={mockConfig}/>,
            );

            const initialCallCount = mockAppsFormComponent.mock.calls.length;
            const newConfig = {
                ...mockConfig,
                dialog: {
                    ...mockConfig.dialog,
                    title: 'Updated Dialog Title',
                },
            };

            // Re-render with different config
            rerender(
                <IntlProvider
                    locale='en'
                    messages={getTranslations('en')}
                >
                    <DialogRouter config={newConfig}/>
                </IntlProvider>,
            );

            // Should have called AppsFormComponent again
            expect(mockAppsFormComponent.mock.calls.length).toBeGreaterThan(initialCallCount);
        });
    });

    describe('error resilience', () => {
        it('should handle null config gracefully', () => {
            // This test verifies the component doesn't crash with invalid props
            expect(() => {
                renderWithIntl(
                    <DialogRouter config={null as any}/>,
                );
            }).not.toThrow();
        });

        it('should handle missing dialog in config', () => {
            const invalidConfig = {
                ...mockConfig,
                dialog: undefined,
            } as any;

            expect(() => {
                renderWithIntl(
                    <DialogRouter config={invalidConfig}/>,
                );
            }).not.toThrow();
        });
    });
});
