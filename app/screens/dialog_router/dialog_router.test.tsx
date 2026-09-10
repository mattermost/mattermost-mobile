// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, render} from '@testing-library/react-native';
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
            <DialogRouter
                config={mockConfig}
                channelId='channel-id-1'
            />,
        );

        expect(getByTestId('apps-form-component')).toBeTruthy();
        expect(mockAppsFormComponent).toHaveBeenCalledWith({
            form: mockAppForm,
            submit: expect.any(Function),
            performLookupCall: expect.any(Function),
            refreshOnSelect: expect.any(Function),
            channelId: 'channel-id-1',
        }, undefined);
    });

    it('should call dialog conversion with correct config', () => {
        renderWithIntl(
            <DialogRouter
                config={mockConfig}
                channelId='channel-id-1'
            />,
        );

        expect(mockInteractiveDialogAdapter.convertToAppForm).toHaveBeenCalledWith(mockConfig);
    });

    it('should create submit handler with correct parameters', () => {
        renderWithIntl(
            <DialogRouter
                config={mockConfig}
                channelId='channel-id-1'
            />,
        );

        // Submit handler is created when handleSubmit callback is used
        const submitHandler = mockAppsFormComponent.mock.calls[0][0].submit;
        expect(typeof submitHandler).toBe('function');
    });

    it('should render nothing when conversion fails', () => {
        mockInteractiveDialogAdapter.convertToAppForm.mockImplementation(() => {
            throw new Error('Conversion failed');
        });

        const {queryByTestId} = renderWithIntl(
            <DialogRouter
                config={mockConfig}
                channelId='channel-id-1'
            />,
        );

        expect(queryByTestId('apps-form-component')).toBeNull();
    });

    it('should render nothing when converted form has no fields', () => {
        mockInteractiveDialogAdapter.convertToAppForm.mockReturnValue({
            ...mockAppForm,
            fields: undefined,
        });

        const {queryByTestId} = renderWithIntl(
            <DialogRouter
                config={mockConfig}
                channelId='channel-id-1'
            />,
        );

        expect(queryByTestId('apps-form-component')).toBeNull();
    });

    it('should render AppsForm when converted form has empty fields array', () => {
        mockInteractiveDialogAdapter.convertToAppForm.mockReturnValue({
            ...mockAppForm,
            fields: [],
        });

        const {getByTestId} = renderWithIntl(
            <DialogRouter
                config={mockConfig}
                channelId='channel-id-1'
            />,
        );

        // Component should still render AppsForm even with empty fields
        // The DialogRouter only checks for fields existence, not if it's empty
        expect(getByTestId('apps-form-component')).toBeTruthy();
    });

    describe('stub action handlers', () => {
        it('should provide performLookupCall that returns empty items', async () => {
            renderWithIntl(
                <DialogRouter
                    config={mockConfig}
                    channelId='channel-id-1'
                />,
            );

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
            renderWithIntl(
                <DialogRouter
                    config={mockConfig}
                    channelId='channel-id-1'
                />,
            );

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
                <DialogRouter
                    config={mockConfig}
                    channelId='channel-id-1'
                />,
            );

            const initialCallCount = mockAppsFormComponent.mock.calls.length;

            // Re-render with same props
            rerender(
                <IntlProvider
                    locale='en'
                    messages={getTranslations('en')}
                >
                    <DialogRouter
                        config={mockConfig}
                        channelId='channel-id-1'
                    />
                </IntlProvider>,
            );

            // Should not have called AppsFormComponent again
            expect(mockAppsFormComponent.mock.calls.length).toBe(initialCallCount);
        });

        it('should re-render when config changes', () => {
            const {rerender} = renderWithIntl(
                <DialogRouter
                    config={mockConfig}
                    channelId='channel-id-1'
                />,
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
                    <DialogRouter
                        config={newConfig}
                        channelId='channel-id-1'
                    />
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
                    <DialogRouter
                        config={null as any}
                        channelId='channel-id-1'
                    />,
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
                    <DialogRouter
                        config={invalidConfig}
                        channelId='channel-id-1'
                    />,
                );
            }).not.toThrow();
        });
    });

    describe('multiform accumulation', () => {
        // Each step's server response REPLACES dialog.elements, and the submission
        // converter looks every value up by element name and drops what it cannot find.
        // So without accumulating element definitions across steps, every answer from an
        // earlier step is silently discarded from the final submission.
        const textElement = (name: string): DialogElement => ({
            name,
            type: 'text',
            display_name: name,
            optional: false,
            default: '',
            placeholder: '',
            help_text: '',
            min_length: 0,
            max_length: 100,
            data_source: '',
            options: [],
        });

        const stepOneConfig: InteractiveDialogConfig = {
            ...mockConfig,
            dialog: {
                ...mockConfig.dialog,
                elements: [textElement('first_name'), textElement('nickname')],
            },
        };

        // Step 2 declares a DIFFERENT field set — first_name is absent.
        const stepTwoElements = [
            {
                name: 'confirmed',
                type: 'bool',
                display_name: 'Confirmed',
                optional: false,
                default: '',
                placeholder: '',
                help_text: '',
                min_length: 0,
                max_length: 0,
                data_source: '',
                options: [],
            },
        ];

        it('keeps earlier steps values in the final submission', async () => {
            // Step 1 submit returns a new form (multiform continues).
            mockInteractiveDialogAdapter.convertResponseToAppCall.mockReturnValueOnce({
                data: {
                    type: 'form',
                    form: {
                        callback_id: 'test-callback',
                        title: 'Step 2',
                        elements: stepTwoElements,
                    },
                },
            } as any);

            // Step 2 submit completes the dialog.
            mockInteractiveDialogAdapter.convertResponseToAppCall.mockReturnValueOnce({
                data: {type: 'ok'},
            } as any);

            renderWithIntl(
                <DialogRouter
                    config={stepOneConfig}
                    channelId='channel-id-1'
                />,
            );

            // act() is required: the step-1 submit sets accumulated state, and without
            // flushing it the handler grabbed below is still step 1's closure (with
            // empty accumulatedValues), which silently takes the single-step path.
            const stepOneSubmit = mockAppsFormComponent.mock.calls[0][0].submit;
            await act(async () => {
                await stepOneSubmit({first_name: 'Ada'});
            });

            // The component re-rendered with step 2's form; grab its submit handler.
            const stepTwoSubmit = mockAppsFormComponent.mock.calls[mockAppsFormComponent.mock.calls.length - 1][0].submit;
            await act(async () => {
                await stepTwoSubmit({confirmed: true});
            });

            // The final request must carry BOTH steps' answers. Before element
            // accumulation this was {confirmed: true} only, losing first_name entirely.
            const finalCall = mockSubmitInteractiveDialog.mock.calls[mockSubmitInteractiveDialog.mock.calls.length - 1];
            expect(finalCall[1].submission).toEqual({
                first_name: 'Ada',
                confirmed: true,
            });
        });

        it('uses the latest declaration when a field is redeclared in a later step', async () => {
            // Step 2 redeclares first_name as a bool, so the accumulated string value
            // must convert using the NEWER element definition.
            mockInteractiveDialogAdapter.convertResponseToAppCall.mockReturnValueOnce({
                data: {
                    type: 'form',
                    form: {
                        callback_id: 'test-callback',
                        title: 'Step 2',
                        elements: [
                            {...stepTwoElements[0], name: 'first_name'},
                        ],
                    },
                },
            } as any);
            mockInteractiveDialogAdapter.convertResponseToAppCall.mockReturnValueOnce({
                data: {type: 'ok'},
            } as any);

            renderWithIntl(
                <DialogRouter
                    config={stepOneConfig}
                    channelId='channel-id-1'
                />,
            );

            const stepOneSubmit = mockAppsFormComponent.mock.calls[0][0].submit;
            await act(async () => {
                await stepOneSubmit({first_name: 'Ada', nickname: 'Adie'});
            });

            const stepTwoSubmit = mockAppsFormComponent.mock.calls[mockAppsFormComponent.mock.calls.length - 1][0].submit;
            await act(async () => {
                await stepTwoSubmit({});
            });

            const finalCall = mockSubmitInteractiveDialog.mock.calls[mockSubmitInteractiveDialog.mock.calls.length - 1];

            // first_name: bool conversion of the truthy string 'Ada' -> true, proving the
            // LATER declaration won the name collision (an earlier-wins merge would emit
            // the string 'Ada'). nickname exists only in step 1, so it also proves the
            // accumulation itself is happening.
            expect(finalCall[1].submission).toEqual({
                first_name: true,
                nickname: 'Adie',
            });
        });
    });
});
