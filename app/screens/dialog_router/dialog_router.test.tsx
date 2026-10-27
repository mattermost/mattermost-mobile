// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, render} from '@testing-library/react-native';
import React from 'react';
import {IntlProvider} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import {Events} from '@constants';
import {getTranslations} from '@i18n';
import IntegrationsManager from '@managers/integrations_manager';
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
    lookupInteractiveDialog: jest.fn(),
}));

jest.mock('@utils/interactive_dialog_adapter');

jest.mock('@managers/integrations_manager', () => {
    const manager = {getTopDialogTriggerId: jest.fn()};
    return {getManager: jest.fn(() => manager)};
});

const mockSubmitInteractiveDialog = require('@actions/remote/integrations').submitInteractiveDialog;
const mockLookupInteractiveDialog = require('@actions/remote/integrations').lookupInteractiveDialog;
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
            refreshForm: expect.any(Function),
            refreshNonce: 0,
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

        it('resolves a dynamic-select lookup for a field nested inside a collapsible section', async () => {
            // Regression: findDialogElement previously searched only the top-level
            // element list, so a dynamic select nested in a collapsible was never
            // found and its lookup silently returned no options.
            const nestedConfig: InteractiveDialogConfig = {
                ...mockConfig,
                dialog: {
                    ...mockConfig.dialog,
                    elements: [
                        {
                            type: 'collapsible',
                            name: 'section',
                            display_name: 'Section',
                            collapsible_config: {
                                elements: [
                                    {
                                        name: 'city',
                                        type: 'select',
                                        display_name: 'City',
                                        data_source: 'dynamic',
                                        data_source_url: '/plugins/example/lookup',
                                    } as unknown as DialogElement,
                                ],
                            },
                        } as unknown as DialogElement,
                    ],
                },
            };
            mockLookupInteractiveDialog.mockResolvedValue({data: {items: [{text: 'Paris', value: 'paris'}]}});

            renderWithIntl(
                <DialogRouter
                    config={nestedConfig}
                    channelId='channel-id-1'
                />,
            );

            const performLookupCall = mockAppsFormComponent.mock.calls[0][0].performLookupCall;
            const result = await performLookupCall({name: 'city'} as AppField, {} as AppFormValues, '');

            expect(mockLookupInteractiveDialog).toHaveBeenCalledTimes(1);
            expect(result).toEqual({data: {type: 'ok', data: {items: [{label: 'Paris', value: 'paris'}]}}});
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

    describe('refresh requests', () => {
        const sourceUrl = 'https://test.com/dialog/source';
        const refreshedDialog = {...mockConfig.dialog, title: 'Refreshed'};

        // A fresh submission per call: refreshes add selected_field to it.
        beforeEach(() => {
            mockInteractiveDialogAdapter.convertValuesToSubmission.mockImplementation(() => ({
                url: mockConfig.url,
                callback_id: 'test-callback',
                state: '',
                submission: {},
                user_id: '',
                channel_id: '',
                team_id: '',
                cancelled: false,
            }));
        });

        const latestProps = () => mockAppsFormComponent.mock.calls.at(-1)[0];

        const renderRouter = (dialog: Partial<InteractiveDialogConfig['dialog']> = {}) => renderWithIntl(
            <DialogRouter
                config={{...mockConfig, dialog: {...mockConfig.dialog, ...dialog}}}
                channelId='channel-id-1'
            />,
        );

        it('should send a field refresh to source_url with the selected field', async () => {
            renderRouter({source_url: sourceUrl});

            await act(() => latestProps().refreshOnSelect({name: 'test_field', refresh: true} as AppField, {test_field: 'a'}));

            expect(mockSubmitInteractiveDialog).toHaveBeenCalledWith(mockServerUrl, expect.objectContaining({
                url: sourceUrl,
                type: 'refresh',
                submission: {selected_field: 'test_field'},
            }));
        });

        it('should send a field refresh to the submit url when the dialog has no source_url', async () => {
            renderRouter();

            await act(() => latestProps().refreshOnSelect({name: 'test_field', refresh: true} as AppField, {test_field: 'a'}));

            expect(mockSubmitInteractiveDialog).toHaveBeenCalledWith(mockServerUrl, expect.objectContaining({
                url: mockConfig.url,
                type: 'refresh',
            }));
        });

        it('should keep the typed value in the form returned by a field refresh', async () => {
            mockSubmitInteractiveDialog.mockResolvedValue({data: {type: 'form', form: refreshedDialog}});
            renderRouter({source_url: sourceUrl});

            await act(() => latestProps().refreshOnSelect({name: 'test_field', refresh: true} as AppField, {test_field: 'typed'}));

            expect(latestProps().form.fields[0].value).toBe('typed');
        });

        // e.g. a submit_buttons "Add Note" that returns the dialog again: carrying the
        // note into the new form made a later "Save & Close" save it a second time.
        it('should not carry a submitted value into the form the submit returns', async () => {
            mockInteractiveDialogAdapter.convertResponseToAppCall.mockReturnValueOnce({
                data: {type: 'form', form: refreshedDialog},
            } as any);
            renderRouter();

            await act(() => latestProps().submit({test_field: 'typed'}));

            expect(latestProps().form.fields[0].value).toBeUndefined();
        });

        it('should bump refreshNonce when a dialog closes and this one is on top again', () => {
            jest.mocked(IntegrationsManager.getManager(mockServerUrl).getTopDialogTriggerId).mockReturnValue(mockConfig.trigger_id);
            renderRouter({source_url: sourceUrl, refresh_on_return: true});

            act(() => {
                DeviceEventEmitter.emit(Events.INTERACTIVE_DIALOG_CLOSED, {serverUrl: mockServerUrl, triggerId: 'child'});
            });

            expect(latestProps().refreshNonce).toBe(1);
        });

        it('should not bump refreshNonce while another dialog is still on top', () => {
            jest.mocked(IntegrationsManager.getManager(mockServerUrl).getTopDialogTriggerId).mockReturnValue('other-dialog');
            renderRouter({source_url: sourceUrl, refresh_on_return: true});

            act(() => {
                DeviceEventEmitter.emit(Events.INTERACTIVE_DIALOG_CLOSED, {serverUrl: mockServerUrl, triggerId: 'child'});
            });

            expect(latestProps().refreshNonce).toBe(0);
        });

        it('should not bump refreshNonce when the dialog does not set refresh_on_return', () => {
            jest.mocked(IntegrationsManager.getManager(mockServerUrl).getTopDialogTriggerId).mockReturnValue(mockConfig.trigger_id);
            renderRouter({source_url: sourceUrl});

            act(() => {
                DeviceEventEmitter.emit(Events.INTERACTIVE_DIALOG_CLOSED, {serverUrl: mockServerUrl, triggerId: 'child'});
            });

            expect(latestProps().refreshNonce).toBe(0);
        });

        it('should refresh the whole form from source_url without a selected field', async () => {
            mockSubmitInteractiveDialog.mockResolvedValue({data: {type: 'form', form: refreshedDialog}});
            renderRouter({source_url: sourceUrl, refresh_on_return: true});

            const result = await act(() => latestProps().refreshForm({test_field: 'typed'}));

            expect(mockSubmitInteractiveDialog).toHaveBeenCalledWith(mockServerUrl, expect.objectContaining({
                url: sourceUrl,
                type: 'refresh',
                submission: {},
            }));
            expect(result.data.type).toBe('form');
            expect(mockInteractiveDialogAdapter.convertToAppForm).toHaveBeenLastCalledWith(expect.objectContaining({dialog: refreshedDialog}));
        });

        it('should ignore a refresh response superseded by a newer refresh', async () => {
            let resolveFirst: (value: unknown) => void = () => undefined;
            mockSubmitInteractiveDialog.
                mockReturnValueOnce(new Promise((resolve) => {
                    resolveFirst = resolve;
                })).
                mockResolvedValueOnce({data: {type: 'form', form: refreshedDialog}});
            renderRouter({source_url: sourceUrl, refresh_on_return: true});

            const {refreshForm} = latestProps();
            const first = refreshForm({});
            await act(() => refreshForm({}));
            resolveFirst({data: {type: 'form', form: {...mockConfig.dialog, title: 'Stale'}}});

            expect(await act(() => first)).toEqual({data: {type: 'ok'}});
            expect(mockInteractiveDialogAdapter.convertToAppForm).not.toHaveBeenCalledWith(expect.objectContaining({dialog: expect.objectContaining({title: 'Stale'})}));
        });
    });
});
