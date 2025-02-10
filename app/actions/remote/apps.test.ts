// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppCallResponseTypes} from '@constants/apps';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';

import {
    handleBindingClick,
    doAppSubmit,
    doAppFetchForm,
    doAppLookup,
    postEphemeralCallResponseForPost,
    postEphemeralCallResponseForChannel,
    postEphemeralCallResponseForContext,
    postEphemeralCallResponseForCommandArgs,
} from './apps';

import type PostModel from '@typings/database/models/servers/post';

const serverUrl = 'baseHandler.test.com';

const mockIntl = {
    formatMessage: jest.fn((config) => {
        return config.defaultMessage;
    }),
} as any;

const mockBinding: AppBinding = {
    app_id: 'app1',
    location: 'location1',
    label: 'Test Binding',
    form: {
        submit: {
            path: '/submit/path',
        },
        source: {
            path: '/source/path',
        },
    },
    submit: {
        path: '/submit/path',
    },
};

const mockContext: AppContext = {
    app_id: 'app1',
    channel_id: 'channel1',
    team_id: 'team1',
    post_id: 'post1',
    root_id: 'root1',
};

const mockResponse: AppCallResponse = {
    type: AppCallResponseTypes.OK,
    text: 'Success',
    app_metadata: {
        bot_user_id: 'bot1',
        bot_username: 'testbot',
    },
};

const mockNavigateResponse: AppCallResponse = {
    type: AppCallResponseTypes.NAVIGATE,
    text: 'Navigating',
    navigate_to_url: 'https://example.com',
};

const mockPost = {
    id: 'post1',
    channelId: 'channel1',
    rootId: 'root1',
} as PostModel;

const mockCommandArgs = {
    channel_id: 'channel1',
    root_id: 'root1',
} as CommandArgs;

const mockFormResponse: AppCallResponse = {
    type: AppCallResponseTypes.FORM,
    form: {
        title: 'Test Form',
        submit: {
            path: '/submit/path',
        },
    },
};

const mockErrorResponse: AppCallResponse = {
    type: AppCallResponseTypes.ERROR,
    text: 'Error occurred',
};

const mockClient = {
    executeAppCall: jest.fn(),
} as any;

jest.mock('@actions/local/post', () => {
    const mockSendEphemeralPost = jest.fn().mockReturnValue({});
    return {
        sendEphemeralPost: mockSendEphemeralPost,
    };
});

const mockSendEphemeralPost = jest.requireMock('@actions/local/post').sendEphemeralPost;

const throwFunc = () => {
    throw Error('error');
};

describe('apps', () => {
    beforeEach(async () => {
        NetworkManager.getClient = () => mockClient;
        await DatabaseManager.init([serverUrl]);
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('handleBindingClick', () => {
        it('should handle form source binding', async () => {
            mockClient.executeAppCall.mockResolvedValueOnce(mockFormResponse);

            const result = await handleBindingClick(serverUrl, mockBinding, mockContext, mockIntl);

            expect(result.data).toBeDefined();
            expect(result.data?.type).toBe(AppCallResponseTypes.FORM);
            expect(mockClient.executeAppCall).toHaveBeenCalledTimes(1);
        });

        it('should handle form binding', async () => {
            const bindingWithForm = {...mockBinding};
            delete bindingWithForm.form?.source;

            const result = await handleBindingClick(serverUrl, bindingWithForm, mockContext, mockIntl);

            expect(result.data).toBeDefined();
            expect(result.data?.type).toBe(AppCallResponseTypes.FORM);
            expect(mockClient.executeAppCall).not.toHaveBeenCalled();
        });

        it('should handle submit binding', async () => {
            const bindingWithSubmit = {...mockBinding};
            delete bindingWithSubmit.form;

            mockClient.executeAppCall.mockResolvedValueOnce(mockResponse);

            const result = await handleBindingClick(serverUrl, bindingWithSubmit, mockContext, mockIntl);

            expect(result.data).toBeDefined();
            expect(result.data?.type).toBe(AppCallResponseTypes.OK);
            expect(mockClient.executeAppCall).toHaveBeenCalledTimes(1);
        });

        it('should handle malformed binding', async () => {
            const malformedBinding = {...mockBinding};
            delete malformedBinding.form;
            delete malformedBinding.submit;

            const result = await handleBindingClick(serverUrl, malformedBinding, mockContext, mockIntl);

            expect(result.error).toBeDefined();
            expect(mockClient.executeAppCall).not.toHaveBeenCalled();
        });
    });

    describe('doAppSubmit', () => {
        const mockCall = {
            path: '/submit/path',
            context: mockContext,
        };

        it('should handle navigation response', async () => {
            mockClient.executeAppCall.mockResolvedValueOnce(mockNavigateResponse);

            const result = await doAppSubmit(serverUrl, mockCall, mockIntl) as any;

            expect(result.data).toBeDefined();
            expect(result.data?.type).toBe(AppCallResponseTypes.NAVIGATE);
            expect(result.data?.navigate_to_url).toBe('https://example.com');
        });

        it('should handle invalid navigation response', async () => {
            const invalidNavigateResponse = {
                type: AppCallResponseTypes.NAVIGATE,
                text: 'Invalid Navigation',
            };
            mockClient.executeAppCall.mockResolvedValueOnce(invalidNavigateResponse);

            const result = await doAppSubmit(serverUrl, mockCall, mockIntl) as any;

            expect(result.error).toBeDefined();
            expect(result.error?.text).toContain('no url was included');
        });

        it('should handle unknown response type', async () => {
            const unknownResponse = {
                type: 'UNKNOWN_TYPE',
                text: 'Unknown',
            };
            mockClient.executeAppCall.mockResolvedValueOnce(unknownResponse);

            const result = await doAppSubmit(serverUrl, mockCall, mockIntl) as any;

            expect(result.error).toBeDefined();
            expect(result.error?.text).toContain('not supported');
        });

        it('should handle successful submit', async () => {
            mockClient.executeAppCall.mockResolvedValueOnce(mockResponse);

            const result = await doAppSubmit(serverUrl, mockCall, mockIntl) as any;

            expect(result.data).toBeDefined();
            expect(result.data?.type).toBe(AppCallResponseTypes.OK);
        });

        it('should handle error response', async () => {
            mockClient.executeAppCall.mockResolvedValueOnce(mockErrorResponse);

            const result = await doAppSubmit(serverUrl, mockCall, mockIntl) as any;

            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe(AppCallResponseTypes.ERROR);
        });

        it('should handle form response', async () => {
            mockClient.executeAppCall.mockResolvedValueOnce(mockFormResponse);

            const result = await doAppSubmit(serverUrl, mockCall, mockIntl) as any;

            expect(result.data).toBeDefined();
            expect(result.data?.type).toBe(AppCallResponseTypes.FORM);
        });

        it('should handle network error', async () => {
            mockClient.executeAppCall.mockRejectedValueOnce(new Error('Network error'));

            const result = await doAppSubmit(serverUrl, mockCall, mockIntl) as any;

            expect(result.error).toBeDefined();
            expect(result.error?.text).toBe('Network error');
        });
    });

    describe('doAppLookup', () => {
        const mockCall = {
            path: '/lookup/path',
            context: mockContext,
        };

        it('should handle successful lookup', async () => {
            mockClient.executeAppCall.mockResolvedValueOnce(mockResponse);

            const result = await doAppLookup(serverUrl, mockCall, mockIntl);

            expect(result.data).toBeDefined();
            expect(result.data?.type).toBe(AppCallResponseTypes.OK);
        });

        it('should handle error response', async () => {
            mockClient.executeAppCall.mockResolvedValueOnce(mockErrorResponse);

            const result = await doAppLookup(serverUrl, mockCall, mockIntl);

            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe(AppCallResponseTypes.ERROR);
        });

        it('should handle network error', async () => {
            mockClient.executeAppCall.mockRejectedValueOnce(new Error('Network error'));

            const result = await doAppLookup(serverUrl, mockCall, mockIntl);

            expect(result.error).toBeDefined();
            expect(result.error?.text).toBe('Network error');
        });
    });

    describe('doAppFetchForm', () => {
        const mockCall = {
            path: '/form/path',
            context: mockContext,
        };

        it('should handle successful form fetch', async () => {
            mockClient.executeAppCall.mockResolvedValueOnce(mockFormResponse);

            const result = await doAppFetchForm(serverUrl, mockCall, mockIntl);

            expect(result.data).toBeDefined();
            expect(result.data?.type).toBe(AppCallResponseTypes.FORM);
        });

        it('should handle error response', async () => {
            mockClient.executeAppCall.mockResolvedValueOnce(mockErrorResponse);

            const result = await doAppFetchForm(serverUrl, mockCall, mockIntl);

            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe(AppCallResponseTypes.ERROR);
        });

        it('should handle invalid form response', async () => {
            const invalidFormResponse = {
                type: AppCallResponseTypes.FORM,
                form: {},
            };
            mockClient.executeAppCall.mockResolvedValueOnce(invalidFormResponse);

            const result = await doAppFetchForm(serverUrl, mockCall, mockIntl);

            expect(result.error).toBeDefined();
        });

        it('should handle thrown errors', async () => {
            jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);
            mockClient.executeAppCall.mockResolvedValueOnce(mockFormResponse);

            const result = await doAppFetchForm(serverUrl, mockCall, mockIntl);

            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe(AppCallResponseTypes.ERROR);
        });
    });

    describe('ephemeral posts', () => {
        const message = 'Test message';

        beforeEach(() => {
            mockSendEphemeralPost.mockClear();
        });

        it('should post ephemeral response for post', () => {
            const result = postEphemeralCallResponseForPost(serverUrl, mockResponse, message, mockPost);
            expect(result).toBeDefined();
            expect(mockSendEphemeralPost).toHaveBeenCalledWith(
                serverUrl,
                message,
                mockPost.channelId,
                mockPost.rootId || mockPost.id,
                mockResponse.app_metadata?.bot_user_id,
            );
        });

        it('should post ephemeral response for channel', () => {
            const result = postEphemeralCallResponseForChannel(serverUrl, mockResponse, message, mockPost.channelId);
            expect(result).toBeDefined();
            expect(mockSendEphemeralPost).toHaveBeenCalledWith(
                serverUrl,
                message,
                mockPost.channelId,
                '',
                mockResponse.app_metadata?.bot_user_id,
            );
        });

        it('should post ephemeral response for context', () => {
            const result = postEphemeralCallResponseForContext(serverUrl, mockResponse, message, mockContext);
            expect(result).toBeDefined();
            expect(mockSendEphemeralPost).toHaveBeenCalledWith(
                serverUrl,
                message,
                mockContext.channel_id,
                mockContext.root_id || mockContext.post_id,
                mockResponse.app_metadata?.bot_user_id,
            );
        });

        it('should post ephemeral response for command args', () => {
            const result = postEphemeralCallResponseForCommandArgs(serverUrl, mockResponse, message, mockCommandArgs);
            expect(result).toBeDefined();
            expect(mockSendEphemeralPost).toHaveBeenCalledWith(
                serverUrl,
                message,
                mockCommandArgs.channel_id,
                mockCommandArgs.root_id,
                mockResponse.app_metadata?.bot_user_id,
            );
        });

        it('should handle undefined bot_user_id', () => {
            const responseWithoutBot = {...mockResponse, app_metadata: undefined};
            const result = postEphemeralCallResponseForPost(serverUrl, responseWithoutBot, message, mockPost);
            expect(result).toBeDefined();
            expect(mockSendEphemeralPost).toHaveBeenCalledWith(
                serverUrl,
                message,
                mockPost.channelId,
                mockPost.rootId || mockPost.id,
                undefined,
            );
        });
    });

    describe('error handling', () => {
        it('should handle null binding', async () => {
            const emptyBinding = {
                app_id: 'app1',
                location: 'location1',
                label: 'Test Binding',
            } as AppBinding;
            const result = await handleBindingClick(serverUrl, emptyBinding, mockContext, mockIntl);
            expect(result).toBeDefined();
            expect(result.error).toBeDefined();
            expect(result.error?.text).toBe('This binding is not properly formed. Contact the App developer.');
        });
    });
});
