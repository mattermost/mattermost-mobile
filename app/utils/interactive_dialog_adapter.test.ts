// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppCallResponseTypes} from '@constants/apps';

import {convertDialogToAppForm, convertAppFormValuesToDialogSubmission} from './dialog_conversion';
import {InteractiveDialogAdapter} from './interactive_dialog_adapter';

// Mock dependencies
jest.mock('@actions/remote/integrations');
jest.mock('./dialog_conversion');
jest.mock('@utils/log');

const mockSubmitInteractiveDialog = require('@actions/remote/integrations').submitInteractiveDialog;
const mockConvertDialogToAppForm = convertDialogToAppForm as jest.MockedFunction<typeof convertDialogToAppForm>;
const mockConvertAppFormValuesToDialogSubmission = convertAppFormValuesToDialogSubmission as jest.MockedFunction<typeof convertAppFormValuesToDialogSubmission>;

// Mock intl object
const mockIntl = {
    formatMessage: jest.fn(({defaultMessage}, values) => {
        if (values && defaultMessage?.includes('{error}')) {
            return defaultMessage.replace('{error}', values.error);
        }
        return defaultMessage;
    }),
};

describe('InteractiveDialogAdapter', () => {
    const mockConfig: InteractiveDialogConfig = {
        app_id: 'test-app',
        dialog: {
            callback_id: 'test-callback',
            title: 'Test Dialog',
            introduction_text: 'Test introduction',
            elements: [
                {
                    name: 'text_field',
                    type: 'text',
                    display_name: 'Text Field',
                    optional: false,
                    default: 'default_value',
                    placeholder: 'Enter text',
                    help_text: 'Help text',
                    min_length: 0,
                    max_length: 100,
                    data_source: '',
                    options: [],
                },
                {
                    name: 'select_field',
                    type: 'select',
                    display_name: 'Select Field',
                    optional: true,
                    options: [
                        {value: 'option1', text: 'Option 1'},
                        {value: 'option2', text: 'Option 2'},
                    ],
                    default: '',
                    placeholder: '',
                    help_text: '',
                    min_length: 0,
                    max_length: 0,
                    data_source: '',
                },
            ],
            submit_label: 'Submit',
            state: 'test-state',
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
                name: 'text_field',
                type: 'text',
                is_required: true,
                label: 'Text Field',
                description: 'Help text',
                position: 0,
                hint: 'Enter text',
                value: 'default_value',
                max_length: 100,
                min_length: 0,
            },
            {
                name: 'select_field',
                type: 'static_select',
                is_required: false,
                label: 'Select Field',
                position: 1,
                options: [
                    {label: 'Option 1', value: 'option1'},
                    {label: 'Option 2', value: 'option2'},
                ],
            },
        ],
        submit: {
            path: '/dialog/submit',
            expand: {},
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Set up default mock return values
        mockConvertDialogToAppForm.mockReturnValue(mockAppForm);

        // Cache is private and managed internally - no need to clear it manually
    });

    describe('convertToAppForm', () => {
        it('should convert dialog config to app form', () => {
            const result = InteractiveDialogAdapter.convertToAppForm(mockConfig);

            expect(mockConvertDialogToAppForm).toHaveBeenCalledWith(mockConfig);
            expect(result).toBe(mockAppForm);
        });

        it('should cache conversion results', () => {
            // Use a fresh config object to avoid any existing cache
            const freshConfig = {...mockConfig};

            // First call
            const result1 = InteractiveDialogAdapter.convertToAppForm(freshConfig);
            expect(mockConvertDialogToAppForm).toHaveBeenCalledTimes(1);
            expect(result1).toBe(mockAppForm);

            // Second call with same config should use cache
            const result2 = InteractiveDialogAdapter.convertToAppForm(freshConfig);
            expect(mockConvertDialogToAppForm).toHaveBeenCalledTimes(1); // Still 1
            expect(result2).toBe(mockAppForm);
            expect(result1).toBe(result2); // Same object reference
        });

        it('should not cache results for different configs', () => {
            // Use fresh config objects to avoid any existing cache
            const config1 = {...mockConfig};
            const config2 = {...mockConfig, trigger_id: 'different-trigger'};

            InteractiveDialogAdapter.convertToAppForm(config1);
            InteractiveDialogAdapter.convertToAppForm(config2);

            expect(mockConvertDialogToAppForm).toHaveBeenCalledTimes(2);
            expect(mockConvertDialogToAppForm).toHaveBeenNthCalledWith(1, config1);
            expect(mockConvertDialogToAppForm).toHaveBeenNthCalledWith(2, config2);
        });
    });

    describe('convertValuesToSubmission', () => {
        const mockAppFormValues: AppFormValues = {
            text_field: 'user input',
            select_field: {label: 'Option 1', value: 'option1'},
        };

        it('should convert app form values to dialog submission format', () => {
            const mockConversionResult = {
                submission: {
                    text_field: 'user input',
                    select_field: 'option1',
                },
                errors: [],
            };
            mockConvertAppFormValuesToDialogSubmission.mockReturnValue(mockConversionResult);

            const result = InteractiveDialogAdapter.convertValuesToSubmission(mockAppFormValues, mockConfig);

            expect(mockConvertAppFormValuesToDialogSubmission).toHaveBeenCalledWith(
                mockAppFormValues,
                mockConfig.dialog.elements,
            );
            expect(result).toEqual({
                url: 'https://test.com/dialog',
                callback_id: 'test-callback',
                state: 'test-state',
                submission: {
                    text_field: 'user input',
                    select_field: 'option1',
                },
                user_id: '',
                channel_id: '',
                team_id: '',
                cancelled: false,
            });
        });

        it('should handle conversion errors', () => {
            const mockConversionResult = {
                submission: {},
                errors: ['Field validation failed'],
            };
            mockConvertAppFormValuesToDialogSubmission.mockReturnValue(mockConversionResult);

            const result = InteractiveDialogAdapter.convertValuesToSubmission(mockAppFormValues, mockConfig);

            expect(result.submission).toEqual({});

            // Should still return valid DialogSubmission structure even with errors
            expect(result.callback_id).toBe('test-callback');
        });

        it('should handle missing url and callback_id gracefully', () => {
            const configWithMissingFields = {
                ...mockConfig,
                url: undefined,
                dialog: {
                    ...mockConfig.dialog,
                    callback_id: undefined,
                },
            } as any;

            mockConvertAppFormValuesToDialogSubmission.mockReturnValue({
                submission: {},
                errors: [],
            });

            const result = InteractiveDialogAdapter.convertValuesToSubmission({}, configWithMissingFields);

            expect(result.url).toBe('');
            expect(result.callback_id).toBe('');
        });
    });

    describe('createSubmitHandler', () => {
        const serverUrl = 'https://test.mattermost.com';
        const mockAppFormValues: AppFormValues = {
            text_field: 'test input',
        };

        it('should create submit handler that converts and submits successfully', async () => {
            const mockConversionResult = {
                submission: {text_field: 'test input'},
                errors: [],
            };
            const mockSubmissionResult = {data: {success: true}};

            mockConvertAppFormValuesToDialogSubmission.mockReturnValue(mockConversionResult);
            mockSubmitInteractiveDialog.mockResolvedValue(mockSubmissionResult);

            const submitHandler = InteractiveDialogAdapter.createSubmitHandler(mockConfig, serverUrl, mockIntl as any);
            const result = await submitHandler(mockAppFormValues);

            expect(mockSubmitInteractiveDialog).toHaveBeenCalledWith(serverUrl, expect.objectContaining({
                callback_id: 'test-callback',
                submission: {text_field: 'test input'},
                cancelled: false,
            }));

            expect(result).toEqual({
                data: {
                    type: AppCallResponseTypes.OK,
                    text: '',
                },
            });
        });

        it('should handle server-side validation errors', async () => {
            const mockConversionResult = {
                submission: {text_field: 'invalid input'},
                errors: [],
            };
            const mockSubmissionResult = {
                data: {
                    error: 'Validation failed',
                    errors: {text_field: 'Field is required'},
                },
            };

            mockConvertAppFormValuesToDialogSubmission.mockReturnValue(mockConversionResult);
            mockSubmitInteractiveDialog.mockResolvedValue(mockSubmissionResult);

            const submitHandler = InteractiveDialogAdapter.createSubmitHandler(mockConfig, serverUrl, mockIntl as any);
            const result = await submitHandler(mockAppFormValues);

            expect(result).toEqual({
                error: {
                    type: AppCallResponseTypes.ERROR,
                    text: 'Validation failed',
                    data: {
                        errors: {text_field: 'Field is required'},
                    },
                },
            });
        });

        it('should handle network errors with appropriate message', async () => {
            const networkError = new Error('network timeout error');
            mockConvertAppFormValuesToDialogSubmission.mockReturnValue({submission: {}, errors: []});
            mockSubmitInteractiveDialog.mockRejectedValue(networkError);

            const submitHandler = InteractiveDialogAdapter.createSubmitHandler(mockConfig, serverUrl, mockIntl as any);
            const result = await submitHandler(mockAppFormValues);

            expect(result).toEqual({
                error: {
                    type: AppCallResponseTypes.ERROR,
                    text: 'Submission failed due to network error. Please check your connection and try again.',
                    data: {
                        errors: {},
                    },
                },
            });
        });

        it('should handle validation errors with appropriate message', async () => {
            const validationError = new Error('Conversion validation failed');
            mockConvertAppFormValuesToDialogSubmission.mockReturnValue({submission: {}, errors: []});
            mockSubmitInteractiveDialog.mockRejectedValue(validationError);

            const submitHandler = InteractiveDialogAdapter.createSubmitHandler(mockConfig, serverUrl, mockIntl as any);
            const result = await submitHandler(mockAppFormValues);

            expect(result).toEqual({
                error: {
                    type: AppCallResponseTypes.ERROR,
                    text: 'Submission failed due to form validation. Please check your inputs and try again.',
                    data: {
                        errors: {},
                    },
                },
            });
        });

        it('should handle generic errors with fallback message', async () => {
            const genericError = new Error('Unexpected error');
            mockConvertAppFormValuesToDialogSubmission.mockReturnValue({submission: {}, errors: []});
            mockSubmitInteractiveDialog.mockRejectedValue(genericError);

            const submitHandler = InteractiveDialogAdapter.createSubmitHandler(mockConfig, serverUrl, mockIntl as any);
            const result = await submitHandler(mockAppFormValues);

            expect(result).toEqual({
                error: {
                    type: AppCallResponseTypes.ERROR,
                    text: 'Submission failed: Unexpected error',
                    data: {
                        errors: {},
                    },
                },
            });
        });

        it('should handle non-Error exceptions', async () => {
            mockConvertAppFormValuesToDialogSubmission.mockReturnValue({submission: {}, errors: []});
            mockSubmitInteractiveDialog.mockRejectedValue('String error');

            const submitHandler = InteractiveDialogAdapter.createSubmitHandler(mockConfig, serverUrl, mockIntl as any);
            const result = await submitHandler(mockAppFormValues);

            expect(result).toEqual({
                error: {
                    type: AppCallResponseTypes.ERROR,
                    text: 'Submission failed. Please try again.',
                    data: {
                        errors: {},
                    },
                },
            });
        });
    });

    describe('createCancelHandler', () => {
        const serverUrl = 'https://test.mattermost.com';

        it('should handle cancellation when notify_on_cancel is true', async () => {
            const configWithNotification = {
                ...mockConfig,
                dialog: {
                    ...mockConfig.dialog,
                    notify_on_cancel: true,
                },
            };

            mockConvertAppFormValuesToDialogSubmission.mockReturnValue({
                submission: {},
                errors: [],
            });
            mockSubmitInteractiveDialog.mockResolvedValue({data: {success: true}});

            const cancelHandler = InteractiveDialogAdapter.createCancelHandler(configWithNotification, serverUrl);
            await cancelHandler();

            expect(mockSubmitInteractiveDialog).toHaveBeenCalledWith(serverUrl, expect.objectContaining({
                callback_id: 'test-callback',
                cancelled: true,
            }));
        });

        it('should not submit when notify_on_cancel is false', async () => {
            const cancelHandler = InteractiveDialogAdapter.createCancelHandler(mockConfig, serverUrl);
            await cancelHandler();

            expect(mockSubmitInteractiveDialog).not.toHaveBeenCalled();
        });

        it('should handle cancellation errors gracefully', async () => {
            const configWithNotification = {
                ...mockConfig,
                dialog: {
                    ...mockConfig.dialog,
                    notify_on_cancel: true,
                },
            };

            mockConvertAppFormValuesToDialogSubmission.mockReturnValue({submission: {}, errors: []});
            mockSubmitInteractiveDialog.mockRejectedValue(new Error('Network error'));

            const cancelHandler = InteractiveDialogAdapter.createCancelHandler(configWithNotification, serverUrl);

            // Should not throw
            await expect(cancelHandler()).resolves.not.toThrow();
        });
    });

    describe('convertResponseToAppCall', () => {
        it('should convert successful response', () => {
            const successResult = {data: {success: true}};

            const result = InteractiveDialogAdapter.convertResponseToAppCall(successResult, mockIntl as any);

            expect(result).toEqual({
                data: {
                    type: AppCallResponseTypes.OK,
                    text: '',
                },
            });
        });

        it('should convert server validation errors', () => {
            const errorResult = {
                data: {
                    error: 'Validation failed',
                    errors: {field1: 'Required field'},
                },
            };

            const result = InteractiveDialogAdapter.convertResponseToAppCall(errorResult, mockIntl as any);

            expect(result).toEqual({
                error: {
                    type: AppCallResponseTypes.ERROR,
                    text: 'Validation failed',
                    data: {
                        errors: {field1: 'Required field'},
                    },
                },
            });
        });

        it('should handle errors without message', () => {
            const errorResult = {
                data: {
                    errors: {field1: 'Required field'},
                },
            };

            const result = InteractiveDialogAdapter.convertResponseToAppCall(errorResult, mockIntl as any);

            expect(result).toEqual({
                error: {
                    type: AppCallResponseTypes.ERROR,
                    text: 'Submission failed with validation errors',
                    data: {
                        errors: {field1: 'Required field'},
                    },
                },
            });
        });

        it('should handle network/action-level errors', () => {
            const errorResult = {error: 'Network timeout'};

            const result = InteractiveDialogAdapter.convertResponseToAppCall(errorResult, mockIntl as any);

            expect(result).toEqual({
                error: {
                    type: AppCallResponseTypes.ERROR,
                    text: 'Submission failed',
                    data: {
                        errors: {},
                    },
                },
            });
        });

        it('should handle missing data gracefully', () => {
            const emptyResult = {};

            const result = InteractiveDialogAdapter.convertResponseToAppCall(emptyResult, mockIntl as any);

            expect(result).toEqual({
                data: {
                    type: AppCallResponseTypes.OK,
                    text: '',
                },
            });
        });

        it('should handle null/undefined result gracefully', () => {
            const result1 = InteractiveDialogAdapter.convertResponseToAppCall(null, mockIntl as any);
            const result2 = InteractiveDialogAdapter.convertResponseToAppCall(undefined, mockIntl as any);

            expect(result1).toEqual({
                data: {
                    type: AppCallResponseTypes.OK,
                    text: '',
                },
            });
            expect(result2).toEqual({
                data: {
                    type: AppCallResponseTypes.OK,
                    text: '',
                },
            });
        });
    });

    describe('WeakMap cache behavior', () => {
        it('should allow garbage collection of config objects', () => {
            mockConvertDialogToAppForm.mockReturnValue(mockAppForm);

            // Create config in limited scope
            let config = {
                ...mockConfig,
                dialog: {...mockConfig.dialog, title: 'Temporary Config'},
            };

            const result = InteractiveDialogAdapter.convertToAppForm(config);
            expect(result).toBe(mockAppForm);
            expect(mockConvertDialogToAppForm).toHaveBeenCalledTimes(1);

            // Remove reference to config (in real scenario, this would allow GC)
            config = null as any;

            // Create new config with same structure but different object reference
            const newConfig = {
                ...mockConfig,
                dialog: {...mockConfig.dialog, title: 'Temporary Config'},
            };

            InteractiveDialogAdapter.convertToAppForm(newConfig);

            // Should call conversion again since old config object was dereferenced
            expect(mockConvertDialogToAppForm).toHaveBeenCalledTimes(2);
        });
    });
});
