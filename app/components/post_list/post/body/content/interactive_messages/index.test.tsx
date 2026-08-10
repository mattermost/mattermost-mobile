// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {act} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {handleGotoLocation} from '@actions/remote/command';
import * as integrationActions from '@actions/remote/integrations';
import {BlockRenderer} from '@components/block_renderer';
import {MM_BLOCKS_SIMPLE} from '@components/block_renderer/translation/test_fixtures';
import {Preferences, Screens} from '@constants';
import * as serverContext from '@context/server';
import IntegrationsManager from '@managers/integrations_manager';
import {dismissMmBlocksExpandedContentIfOpen} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import {InteractiveMessages} from './index';

jest.mock('@actions/remote/command');
jest.mock('@actions/remote/integrations');
jest.mock('@managers/integrations_manager', () => ({
    __esModule: true,
    default: {
        getManager: jest.fn(),
    },
}));
jest.mock('@context/server', () => ({
    ...jest.requireActual('@context/server'),
    useServerUrl: jest.fn(),
}));
jest.mock('@components/block_renderer', () => ({
    BlockRenderer: jest.fn(),
}));
jest.mock('@components/section_notice', () => {
    const MockReact = require('react');
    const {Text, View} = require('react-native');
    return {
        __esModule: true,
        default: ({title, text, testID}: {title: string; text?: string; testID?: string}) =>
            MockReact.createElement(View, {testID},
                MockReact.createElement(Text, null, title),
                text ? MockReact.createElement(Text, null, text) : null,
            ),
    };
});
jest.mock('@screens/navigation', () => ({
    dismissMmBlocksExpandedContentIfOpen: jest.fn(),
}));

const SERVER_URL = 'https://server.com';
const CHANNEL_ID = 'channel-id';
const POST_ID = 'post-id';
const ACTION_COOKIE = 'mm-blocks-cookie';
const ATTACHMENT_COOKIE = 'attachment-cookie';

type BlockActionResult = Awaited<ReturnType<typeof integrationActions.doBlockAction>>;

function MockBlockRenderer(props: ComponentProps<typeof BlockRenderer>) {
    return React.createElement('BlockRenderer', {
        testID: 'block-renderer',
        ...props,
    });
}

describe('InteractiveMessages', () => {
    const theme = Preferences.THEMES.denim;
    const setDialog = jest.fn();

    function getBaseProps(): ComponentProps<typeof InteractiveMessages> {
        return {
            blockActionsEnabled: true,
            channelId: CHANNEL_ID,
            location: Screens.CHANNEL,
            post: TestHelper.fakePostModel({
                id: POST_ID,
                channelId: CHANNEL_ID,
                props: {
                    mm_blocks: [...MM_BLOCKS_SIMPLE],
                    mm_blocks_actions: ACTION_COOKIE,
                },
            }),
            theme,
        };
    }

    /** Post with a required text input and a submit button, i.e. the client-validated form path. */
    function getFormPost() {
        return TestHelper.fakePostModel({
            id: POST_ID,
            channelId: CHANNEL_ID,
            props: {
                mm_blocks: [
                    {type: 'text_input', name: 'title', label: 'Title'},
                    {type: 'button', text: 'Save', action_id: 'save', subtype: 'submit'},
                ],
                mm_blocks_actions: ACTION_COOKIE,
            },
        });
    }

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(serverContext.useServerUrl).mockReturnValue(SERVER_URL);
        jest.mocked(IntegrationsManager.getManager).mockReturnValue({
            setDialog,
        } as unknown as ReturnType<typeof IntegrationsManager.getManager>);
        jest.mocked(BlockRenderer).mockImplementation(MockBlockRenderer);
    });

    it('should return null when post has no interactive content', () => {
        const {toJSON} = renderWithIntlAndTheme(
            <InteractiveMessages
                {...getBaseProps()}
                post={TestHelper.fakePostModel({id: POST_ID, props: {}})}
            />,
        );

        expect(toJSON()).toBeNull();
        expect(BlockRenderer).not.toHaveBeenCalled();
    });

    it('should return null when interactive arrays are empty', () => {
        const {toJSON} = renderWithIntlAndTheme(
            <InteractiveMessages
                {...getBaseProps()}
                post={TestHelper.fakePostModel({
                    id: POST_ID,
                    props: {
                        mm_blocks: [],
                        attachments: [],
                    },
                })}
            />,
        );

        expect(toJSON()).toBeNull();
        expect(BlockRenderer).not.toHaveBeenCalled();
    });

    it('should render BlockRenderer with translated blocks and post metadata', () => {
        const imagesMetadata = {
            'https://example.com/image.png': {format: 'png', height: 100, width: 200},
        };

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages
                {...getBaseProps()}
                post={TestHelper.fakePostModel({
                    id: POST_ID,
                    channelId: CHANNEL_ID,
                    metadata: {images: imagesMetadata},
                    props: {
                        mm_blocks: [...MM_BLOCKS_SIMPLE],
                        mm_blocks_actions: ACTION_COOKIE,
                    },
                })}
            />,
        );

        const renderer = getByTestId('block-renderer');
        expect(renderer.props.blocks).toHaveLength(2);
        expect(renderer.props.blocks[0]).toMatchObject({
            type: 'text',
            text: 'Hello **from** mm blocks',
        });
        expect(renderer.props.channelId).toBe(CHANNEL_ID);
        expect(renderer.props.postId).toBe(POST_ID);
        expect(renderer.props.location).toBe(Screens.CHANNEL);
        expect(renderer.props.theme).toBe(theme);
        expect(renderer.props.imagesMetadata).toEqual(imagesMetadata);
        expect(renderer.props.inlineMarkdownActions).toEqual({
            mmBlocksActionCookie: ACTION_COOKIE,
            integrationFormat: 'mm_block',
        });
    });

    it('should omit form input blocks when block actions are disabled', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages
                {...getBaseProps()}
                blockActionsEnabled={false}
                post={TestHelper.fakePostModel({
                    id: POST_ID,
                    channelId: CHANNEL_ID,
                    props: {
                        mm_blocks: [
                            {type: 'text', text: 'Hello'},
                            {type: 'text_input', name: 'title', label: 'Title'},
                            {type: 'button', text: 'Go', action_id: 'go'},
                        ],
                        mm_blocks_actions: ACTION_COOKIE,
                    },
                })}
            />,
        );

        expect(getByTestId('block-renderer').props.blocks).toEqual([
            {type: 'text', text: 'Hello'},
            {type: 'button', text: 'Go', action_id: 'go'},
        ]);
    });

    it('should not look up dynamic options when block actions are disabled', async () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages
                {...getBaseProps()}
                blockActionsEnabled={false}
            />,
        );

        await act(async () => {
            expect(await getByTestId('block-renderer').props.onLookup('lookup', 'q')).toEqual([]);
        });

        expect(integrationActions.doBlockAction).not.toHaveBeenCalled();
    });

    it('should pass inlineMarkdownActions for mm_block format', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages {...getBaseProps()}/>,
        );

        expect(getByTestId('block-renderer').props.inlineMarkdownActions).toEqual({
            mmBlocksActionCookie: ACTION_COOKIE,
            integrationFormat: 'mm_block',
        });
    });

    it('should ignore non-string mm_blocks_actions values', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages
                {...getBaseProps()}
                post={TestHelper.fakePostModel({
                    id: POST_ID,
                    props: {
                        mm_blocks: [...MM_BLOCKS_SIMPLE],
                        mm_blocks_actions: {invalid: true},
                    },
                })}
            />,
        );

        expect(getByTestId('block-renderer').props.inlineMarkdownActions).toEqual({
            mmBlocksActionCookie: undefined,
            integrationFormat: 'mm_block',
        });
    });

    it('should pass attachment integration format for attachment posts', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages
                {...getBaseProps()}
                post={TestHelper.fakePostModel({
                    id: POST_ID,
                    props: {
                        attachments: [{text: 'Attachment body'}],
                    },
                })}
            />,
        );

        expect(getByTestId('block-renderer').props.inlineMarkdownActions).toEqual({
            mmBlocksActionCookie: undefined,
            integrationFormat: 'attachment',
        });
    });

    it('should call doBlockAction for mm_block format', async () => {
        jest.mocked(integrationActions.doBlockAction).mockResolvedValue({data: {}});

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages {...getBaseProps()}/>,
        );

        const onAction = getByTestId('block-renderer').props.onAction;
        await act(async () => {
            await onAction({actionId: 'submit_action', selectedOption: 'selected', query: {row: '1'}, formValues: {title: 'Bug'}, subtype: 'submit'});
        });

        expect(integrationActions.doBlockAction).toHaveBeenCalledWith(SERVER_URL, {
            subtype: 'execute',
            context: 'post',
            post_id: POST_ID,
            action_id: 'submit_action',
            cookie: ACTION_COOKIE,
            selected_option: 'selected',
            query: {row: '1'},
            form_values: {title: 'Bug'},
            integration_format: 'mm_block',
        });
        expect(integrationActions.postActionWithCookie).not.toHaveBeenCalled();
    });

    it('should call postActionWithCookie with attachment cookie for attachment format', async () => {
        jest.mocked(integrationActions.postActionWithCookie).mockResolvedValue({data: {}});

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages
                {...getBaseProps()}
                post={TestHelper.fakePostModel({
                    id: POST_ID,
                    props: {
                        attachments: [{text: 'Attachment body'}],
                    },
                })}
            />,
        );

        const onAction = getByTestId('block-renderer').props.onAction;
        await act(async () => {
            await onAction({actionId: 'approve', attachmentCookie: ATTACHMENT_COOKIE, formValues: {note: 'ok'}});
        });

        expect(integrationActions.postActionWithCookie).toHaveBeenCalledWith(
            SERVER_URL,
            POST_ID,
            'approve',
            ATTACHMENT_COOKIE,
            '',
            undefined,
            'attachment',
        );
    });

    it('should call handleGotoLocation when action succeeds with goto_location', async () => {
        const gotoLocation = 'https://server.com/team/channels/town-square';
        jest.mocked(integrationActions.doBlockAction).mockResolvedValue({
            data: {goto_location: gotoLocation},
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages {...getBaseProps()}/>,
        );

        const onAction = getByTestId('block-renderer').props.onAction;
        await act(async () => {
            await onAction({actionId: 'submit_action'});
        });

        expect(handleGotoLocation).toHaveBeenCalledWith(
            SERVER_URL,
            expect.anything(),
            gotoLocation,
        );
    });

    it('should not call handleGotoLocation when action returns an error', async () => {
        jest.mocked(integrationActions.doBlockAction).mockResolvedValue({
            error: new Error('action failed'),
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages {...getBaseProps()}/>,
        );

        const onAction = getByTestId('block-renderer').props.onAction;
        await act(async () => {
            await onAction({actionId: 'submit_action'});
        });

        expect(handleGotoLocation).not.toHaveBeenCalled();
        expect(getByTestId('interactive_messages.action_error')).toBeTruthy();
    });

    it('should open block_dialog via IntegrationsManager when response type is dialog', async () => {
        const blockDialog = {
            title: 'Step 2',
            blocks: [{type: 'text', text: 'Next'}],
            submit: {action: 'dialog_submit'},
        };
        jest.mocked(integrationActions.doBlockAction).mockResolvedValue({
            data: {
                type: 'dialog',
                trigger_id: 'trig-1',
                block_dialog: blockDialog,
            },
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages {...getBaseProps()}/>,
        );

        const onAction = getByTestId('block-renderer').props.onAction;
        await act(async () => {
            await onAction({actionId: 'open_dialog'});
        });

        expect(setDialog).toHaveBeenCalledWith({
            trigger_id: 'trig-1',
            channel_id: CHANNEL_ID,
            block_dialog: blockDialog,
        });
    });

    it('should replace blocks when response type is refresh', async () => {
        jest.mocked(integrationActions.doBlockAction).mockResolvedValue({
            data: {
                type: 'refresh',
                mm_blocks: [{type: 'text', text: 'Updated'}],
                mm_blocks_actions: 'new-cookie',
            },
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages {...getBaseProps()}/>,
        );

        const onAction = getByTestId('block-renderer').props.onAction;
        await act(async () => {
            await onAction({actionId: 'refresh'});
        });

        expect(jest.mocked(dismissMmBlocksExpandedContentIfOpen)).toHaveBeenCalled();
        expect(getByTestId('block-renderer').props.blocks).toEqual([
            {type: 'text', text: 'Updated'},
        ]);
        expect(getByTestId('block-renderer').props.inlineMarkdownActions).toEqual({
            mmBlocksActionCookie: 'new-cookie',
            integrationFormat: 'mm_block',
        });
    });

    it('should look up dynamic select options through doBlockAction', async () => {
        const items = [{text: 'Bug', value: 'bug'}];
        jest.mocked(integrationActions.doBlockAction).mockResolvedValue({data: {items}});

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages {...getBaseProps()}/>,
        );

        const onLookup = getByTestId('block-renderer').props.onLookup;
        await act(async () => {
            expect(await onLookup('lookup_action', 'bu', {title: 'Bug'})).toEqual(items);
        });

        expect(integrationActions.doBlockAction).toHaveBeenCalledWith(SERVER_URL, {
            subtype: 'lookup',
            context: 'post',
            post_id: POST_ID,
            action_id: 'lookup_action',
            cookie: ACTION_COOKIE,
            query: {query: 'bu'},
            form_values: {title: 'Bug'},
            integration_format: 'mm_block',
        });
    });

    it('should block submit actions that fail client validation', async () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages
                {...getBaseProps()}
                post={getFormPost()}
            />,
        );

        const onAction = getByTestId('block-renderer').props.onAction;
        await act(async () => {
            await onAction({actionId: 'save', formValues: {title: ''}, subtype: 'submit'});
        });

        expect(integrationActions.doBlockAction).not.toHaveBeenCalled();
        expect(getByTestId('block-renderer').props.errors).toEqual({title: 'This field is required.'});
    });

    it('should set field errors from doBlockAction response', async () => {
        jest.mocked(integrationActions.doBlockAction).mockResolvedValue({
            data: {
                errors: {title: 'Required'},
            },
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages {...getBaseProps()}/>,
        );

        const onAction = getByTestId('block-renderer').props.onAction;
        await act(async () => {
            await onAction({actionId: 'submit'});
        });

        expect(getByTestId('block-renderer').props.errors).toEqual({title: 'Required'});
    });

    it('should clear field errors once a later action succeeds', async () => {
        jest.mocked(integrationActions.doBlockAction).mockResolvedValue({data: {errors: {title: 'Required'}}});

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages
                {...getBaseProps()}
                post={getFormPost()}
            />,
        );

        await act(async () => {
            await getByTestId('block-renderer').props.onAction({actionId: 'save', formValues: {title: 'Bug'}, subtype: 'submit'});
        });
        expect(getByTestId('block-renderer').props.errors).toEqual({title: 'Required'});

        jest.mocked(integrationActions.doBlockAction).mockResolvedValue({data: {}});
        await act(async () => {
            await getByTestId('block-renderer').props.onAction({actionId: 'save', formValues: {title: 'Bug'}, subtype: 'submit'});
        });

        expect(getByTestId('block-renderer').props.errors).toEqual({});
    });

    it('should submit when every field passes client validation', async () => {
        jest.mocked(integrationActions.doBlockAction).mockResolvedValue({data: {}});

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages
                {...getBaseProps()}
                post={getFormPost()}
            />,
        );

        const onAction = getByTestId('block-renderer').props.onAction;
        await act(async () => {
            await onAction({actionId: 'save', formValues: {title: 'Bug'}, subtype: 'submit'});
        });

        expect(integrationActions.doBlockAction).toHaveBeenCalledWith(SERVER_URL, expect.objectContaining({
            action_id: 'save',
            form_values: {title: 'Bug'},
        }));
        expect(getByTestId('block-renderer').props.errors).toEqual({});
    });

    it('should surface a top-level error returned in the response body', async () => {
        jest.mocked(integrationActions.doBlockAction).mockResolvedValue({
            data: {error: 'The integration is unavailable'},
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages {...getBaseProps()}/>,
        );

        const onAction = getByTestId('block-renderer').props.onAction;
        await act(async () => {
            await onAction({actionId: 'submit'});
        });

        expect(getByTestId('interactive_messages.action_error')).toHaveTextContent(/The integration is unavailable/);
        expect(setDialog).not.toHaveBeenCalled();
    });

    it('should fall back to the generic message when the error carries no message', async () => {
        jest.mocked(integrationActions.doBlockAction).mockResolvedValue({error: {}});

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages {...getBaseProps()}/>,
        );

        const onAction = getByTestId('block-renderer').props.onAction;
        await act(async () => {
            await onAction({actionId: 'submit'});
        });

        expect(getByTestId('interactive_messages.action_error')).toHaveTextContent(/An error occurred while executing the action\./);
    });

    it('should discard an action response that a newer request already superseded', async () => {
        let resolveFirstRefresh: (result: BlockActionResult) => void = () => {};
        jest.mocked(integrationActions.doBlockAction).
            mockImplementationOnce(() => new Promise<BlockActionResult>((resolve) => {
                resolveFirstRefresh = resolve;
            })).
            mockResolvedValueOnce({
                data: {type: 'refresh', mm_blocks: [{type: 'text', text: 'Newest'}]},
            });

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages {...getBaseProps()}/>,
        );

        act(() => {
            getByTestId('block-renderer').props.onAction({actionId: 'refresh_field', formValues: {title: 'B'}});
        });

        await act(async () => {
            await getByTestId('block-renderer').props.onAction({actionId: 'refresh_field', formValues: {title: 'Bu'}});
        });

        expect(getByTestId('block-renderer').props.blocks).toEqual([{type: 'text', text: 'Newest'}]);

        await act(async () => {
            resolveFirstRefresh({data: {type: 'refresh', mm_blocks: [{type: 'text', text: 'Stale'}]}});
        });

        expect(getByTestId('block-renderer').props.blocks).toEqual([{type: 'text', text: 'Newest'}]);
    });

    describe('attachment actions', () => {
        function renderAttachmentPost() {
            return renderWithIntlAndTheme(
                <InteractiveMessages
                    {...getBaseProps()}
                    post={TestHelper.fakePostModel({
                        id: POST_ID,
                        props: {
                            attachments: [{text: 'Attachment body'}],
                        },
                    })}
                />,
            );
        }

        it('should surface the error message when the action fails', async () => {
            jest.mocked(integrationActions.postActionWithCookie).mockResolvedValue({
                error: new Error('The integration timed out'),
            });

            const {getByTestId} = renderAttachmentPost();

            const onAction = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'approve', attachmentCookie: ATTACHMENT_COOKIE});
            });

            expect(getByTestId('interactive_messages.action_error')).toHaveTextContent(/The integration timed out/);
            expect(handleGotoLocation).not.toHaveBeenCalled();
        });

        it('should call handleGotoLocation when the action returns goto_location', async () => {
            const gotoLocation = 'https://server.com/team/channels/town-square';
            jest.mocked(integrationActions.postActionWithCookie).mockResolvedValue({
                data: {goto_location: gotoLocation},
            });

            const {getByTestId} = renderAttachmentPost();

            const onAction = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'approve', attachmentCookie: ATTACHMENT_COOKIE});
            });

            expect(handleGotoLocation).toHaveBeenCalledWith(SERVER_URL, expect.anything(), gotoLocation);
        });

        it('should not look up dynamic options', async () => {
            const {getByTestId} = renderAttachmentPost();

            const onLookup = getByTestId('block-renderer').props.onLookup;
            await act(async () => {
                expect(await onLookup('lookup_action', 'bu')).toEqual([]);
            });

            expect(integrationActions.doBlockAction).not.toHaveBeenCalled();
        });
    });

    describe('file uploads in flight', () => {
        it('should pass onUploadingChange so BlockRenderer can report upload state', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <InteractiveMessages {...getBaseProps()}/>,
            );

            expect(typeof getByTestId('block-renderer').props.onUploadingChange).toBe('function');
            expect(getByTestId('block-renderer').props.context).toBe('post');
        });

        it('should block submit until the uploads finish', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <InteractiveMessages
                    {...getBaseProps()}
                    post={getFormPost()}
                />,
            );

            act(() => getByTestId('block-renderer').props.onUploadingChange(true));

            await act(async () => {
                await getByTestId('block-renderer').props.onAction({actionId: 'save', formValues: {title: 'Bug'}, subtype: 'submit'});
            });

            expect(integrationActions.doBlockAction).not.toHaveBeenCalled();
            expect(getByTestId('interactive_messages.action_error')).toHaveTextContent(/Please wait for file uploads to finish/);
        });
    });
});
