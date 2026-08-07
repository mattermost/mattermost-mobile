// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {handleGotoLocation} from '@actions/remote/command';
import {doBlockAction, executeDialogAction, lookupInteractiveDialog, submitInteractiveDialog} from '@actions/remote/integrations';
import {BlockRenderer, type ActionHandler, type LookupHandler} from '@components/block_renderer';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import IntegrationsManager from '@managers/integrations_manager';
import {navigateBack} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {DIALOG_SUBMIT_ACTION_ID} from '@utils/dialog_to_mm_blocks';

import {BlocksDialogShell} from './blocks_dialog_shell';

jest.mock('@actions/remote/command');
jest.mock('@actions/remote/integrations');
jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
    dismissMmBlocksExpandedContentIfOpen: jest.fn(),
}));
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

const SERVER_URL = 'https://server.com';
const CHANNEL_ID = 'channel-1';
const COOKIE = 'dialog-cookie';

function MockBlockRenderer(props: ComponentProps<typeof BlockRenderer>) {
    return React.createElement('BlockRenderer', {
        testID: 'block-renderer',
        ...props,
    });
}

function dialogElement(overrides: Partial<DialogElement> = {}): DialogElement {
    return {
        display_name: 'Name',
        name: 'name',
        type: 'text',
        default: '',
        placeholder: '',
        help_text: '',
        optional: false,
        min_length: 0,
        max_length: 0,
        data_source: '',
        options: [],
        ...overrides,
    };
}

describe('BlocksDialogShell', () => {
    const setDialog = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(useServerUrl).mockReturnValue(SERVER_URL);
        jest.mocked(IntegrationsManager.getManager).mockReturnValue({
            setDialog,
        } as unknown as ReturnType<typeof IntegrationsManager.getManager>);
        jest.mocked(BlockRenderer).mockImplementation(MockBlockRenderer);
        jest.mocked(doBlockAction).mockResolvedValue({data: {}});
        jest.mocked(submitInteractiveDialog).mockResolvedValue({data: {}});
        jest.mocked(lookupInteractiveDialog).mockResolvedValue({data: {}});
        jest.mocked(executeDialogAction).mockResolvedValue({data: {status: 'OK', trigger_id: ''}});
    });

    function nativeProps(overrides: Partial<ComponentProps<typeof BlocksDialogShell>> = {}): ComponentProps<typeof BlocksDialogShell> {
        return {
            mode: 'native',
            blockActionsEnabled: true,
            title: 'Native Dialog',
            channelId: CHANNEL_ID,
            state: 'native-state',
            mmBlocks: [{type: 'text', text: 'Hello'}],
            mmBlocksActions: COOKIE,
            blockSubmit: {label: 'Save', action: 'submit_action'},
            blockCancel: {label: 'Discard', action: 'cancel_action'},
            ...overrides,
        };
    }

    function legacyProps(overrides: Partial<ComponentProps<typeof BlocksDialogShell>> = {}): ComponentProps<typeof BlocksDialogShell> {
        return {
            mode: 'legacy',
            blockActionsEnabled: true,
            title: 'Legacy Dialog',
            channelId: CHANNEL_ID,
            state: 'legacy-state',
            url: 'https://example.com/dialog',
            callbackId: 'callback-1',
            elements: [dialogElement()],
            introductionText: 'Fill this out',
            submitLabel: 'Go',
            ...overrides,
        };
    }

    describe('native mode', () => {
        it('should render the translated blocks with the dialog submit and cancel chrome', () => {
            const {getByTestId, getByText} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps()}/>,
            );

            const renderer = getByTestId('block-renderer');
            expect(renderer.props.blocks).toEqual([{type: 'text', text: 'Hello'}]);
            expect(renderer.props.channelId).toBe(CHANNEL_ID);
            expect(renderer.props.postId).toBe('');
            expect(renderer.props.location).toBe(Screens.DIALOG_ROUTER);
            expect(renderer.props.omitForm).toBe(true);
            expect(getByText('Save')).toBeTruthy();
            expect(getByText('Discard')).toBeTruthy();
        });

        it('should omit form input blocks when block actions are disabled', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...nativeProps({
                        blockActionsEnabled: false,
                        mmBlocks: [
                            {type: 'text', text: 'Hello'},
                            {type: 'text_input', name: 'title', label: 'Title'},
                            {type: 'button', text: 'Go', action_id: 'go'},
                        ],
                    })}
                />,
            );

            expect(getByTestId('block-renderer').props.blocks).toEqual([
                {type: 'text', text: 'Hello'},
                {type: 'button', text: 'Go', action_id: 'go'},
            ]);
        });

        it('should fall back to the default submit and cancel labels', () => {
            const {getByText} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...nativeProps({
                        blockSubmit: {action: 'submit_action'},
                        blockCancel: {},
                    })}
                />,
            );

            expect(getByText('Submit')).toBeTruthy();
            expect(getByText('Cancel')).toBeTruthy();
        });

        it('should not render a footer when the dialog has no submit or cancel buttons', () => {
            const {queryByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps({blockSubmit: undefined, blockCancel: undefined})}/>,
            );

            expect(queryByTestId('interactive_dialog.submit.button')).toBeNull();
            expect(queryByTestId('interactive_dialog.cancel.button')).toBeNull();
        });

        it('should render an empty block list when the dialog has no blocks', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps({mmBlocks: []})}/>,
            );

            expect(getByTestId('block-renderer').props.blocks).toEqual([]);
        });

        it('should submit form values through doBlockAction with the dialog context', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...nativeProps({
                        mmBlocks: [{type: 'text_input', name: 'title', label: 'Title'}],
                    })}
                />,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'submit_action', formValues: {title: 'Bug'}, subtype: 'submit'});
            });

            expect(doBlockAction).toHaveBeenCalledWith(SERVER_URL, {
                subtype: 'execute',
                context: 'dialog',
                post_id: '',
                channel_id: CHANNEL_ID,
                action_id: 'submit_action',
                cookie: COOKIE,
                selected_option: undefined,
                query: undefined,
                form_values: {title: 'Bug'},
                integration_format: 'mm_block',
            });
            expect(navigateBack).toHaveBeenCalled();
        });

        it('should submit when the footer submit button is pressed', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps()}/>,
            );

            await act(async () => {
                fireEvent.press(getByTestId('interactive_dialog.submit.button'));
            });

            expect(doBlockAction).toHaveBeenCalledWith(SERVER_URL, expect.objectContaining({
                action_id: 'submit_action',
                context: 'dialog',
                form_values: {},
            }));
        });

        it('should treat a submit button inside the blocks as a form submission', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...nativeProps({
                        blockSubmit: undefined,
                        mmBlocks: [
                            {type: 'text_input', name: 'title', label: 'Title'},
                            {type: 'button', text: 'Save', action_id: 'inline_submit', subtype: 'submit'},
                        ],
                    })}
                />,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'inline_submit', formValues: {title: ''}, subtype: 'submit'});
            });

            expect(doBlockAction).not.toHaveBeenCalled();
            expect(getByTestId('block-renderer').props.errors).toEqual({title: 'This field is required.'});
        });

        it('should show field errors and skip the request when client validation fails', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...nativeProps({
                        mmBlocks: [{type: 'text_input', name: 'title', label: 'Title', min_length: 5}],
                    })}
                />,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'submit_action', formValues: {title: 'ab'}, subtype: 'submit'});
            });

            expect(doBlockAction).not.toHaveBeenCalled();
            expect(getByTestId('block-renderer').props.errors).toEqual({title: 'Minimum input length is 5.'});
            expect(getByTestId('interactive_dialog.error')).toHaveTextContent(/Please fix all field errors/);
        });

        it('should replace the dialog content when the response type is refresh', async () => {
            jest.mocked(doBlockAction).mockResolvedValue({
                data: {
                    type: 'refresh',
                    block_dialog: {
                        title: 'Step 2',
                        blocks: [{type: 'text', text: 'Updated'}],
                        submit: {label: 'Continue', action: 'continue_action'},
                        actions: 'cookie-2',
                    },
                },
            });

            const {getByTestId, getByText} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps()}/>,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'submit_action', formValues: {}, subtype: 'submit'});
            });

            expect(getByTestId('block-renderer').props.blocks).toEqual([{type: 'text', text: 'Updated'}]);
            expect(getByText('Continue')).toBeTruthy();
            expect(navigateBack).not.toHaveBeenCalled();

            jest.mocked(doBlockAction).mockResolvedValue({data: {}});
            await act(async () => {
                fireEvent.press(getByTestId('interactive_dialog.submit.button'));
            });

            expect(doBlockAction).toHaveBeenLastCalledWith(SERVER_URL, expect.objectContaining({
                action_id: 'continue_action',
                cookie: 'cookie-2',
            }));
        });

        it('should restore the original dialog content when new blocks arrive as props', async () => {
            jest.mocked(doBlockAction).mockResolvedValue({
                data: {
                    type: 'refresh',
                    block_dialog: {title: 'Step 2', blocks: [{type: 'text', text: 'Updated'}]},
                },
            });

            const {getByTestId, rerender} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps()}/>,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'submit_action', formValues: {}, subtype: 'submit'});
            });
            expect(getByTestId('block-renderer').props.blocks).toEqual([{type: 'text', text: 'Updated'}]);

            rerender(<BlocksDialogShell {...nativeProps({mmBlocks: [{type: 'text', text: 'Fresh'}]})}/>);

            expect(getByTestId('block-renderer').props.blocks).toEqual([{type: 'text', text: 'Fresh'}]);
        });

        it('should stack a child dialog through IntegrationsManager when the response type is dialog', async () => {
            const blockDialog = {title: 'Child', blocks: [{type: 'text', text: 'Child body'}]};
            jest.mocked(doBlockAction).mockResolvedValue({
                data: {type: 'dialog', trigger_id: 'trigger-2', block_dialog: blockDialog},
            });

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps()}/>,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'open_child'});
            });

            expect(setDialog).toHaveBeenCalledWith({
                trigger_id: 'trigger-2',
                channel_id: CHANNEL_ID,
                block_dialog: blockDialog,
            });
            expect(navigateBack).not.toHaveBeenCalled();
        });

        it('should keep the dialog open when the response asks to', async () => {
            jest.mocked(doBlockAction).mockResolvedValue({data: {keep_dialog_open: true}});

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps()}/>,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'stack_dialog'});
            });

            expect(navigateBack).not.toHaveBeenCalled();
        });

        it('should navigate to the goto location and close the dialog', async () => {
            jest.mocked(doBlockAction).mockResolvedValue({
                data: {goto_location: 'https://server.com/team/channels/town-square'},
            });

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps()}/>,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'goto'});
            });

            expect(handleGotoLocation).toHaveBeenCalledWith(
                SERVER_URL,
                expect.anything(),
                'https://server.com/team/channels/town-square',
            );
            expect(navigateBack).toHaveBeenCalled();
        });

        it('should surface a generic error when the action request fails', async () => {
            jest.mocked(doBlockAction).mockResolvedValue({error: new Error('boom')});

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps()}/>,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'submit_action', subtype: 'submit'});
            });

            expect(getByTestId('interactive_dialog.error')).toHaveTextContent(/Action failed to execute/);
            expect(navigateBack).not.toHaveBeenCalled();
        });

        it('should surface the error message returned by the integration', async () => {
            jest.mocked(doBlockAction).mockResolvedValue({data: {error: 'Integration says no'}});

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps()}/>,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'submit_action', subtype: 'submit'});
            });

            expect(getByTestId('interactive_dialog.error')).toHaveTextContent(/Integration says no/);
        });

        it('should set the field errors returned by the integration', async () => {
            jest.mocked(doBlockAction).mockResolvedValue({data: {errors: {title: 'Already taken'}}});

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps()}/>,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'submit_action', subtype: 'submit'});
            });

            expect(getByTestId('block-renderer').props.errors).toEqual({title: 'Already taken'});
            expect(navigateBack).not.toHaveBeenCalled();
        });

        it('should clear the field errors once a later action succeeds', async () => {
            jest.mocked(doBlockAction).mockResolvedValue({data: {errors: {title: 'Already taken'}}});

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps()}/>,
            );

            await act(async () => {
                await getByTestId('block-renderer').props.onAction({actionId: 'submit_action', subtype: 'submit'});
            });
            expect(getByTestId('block-renderer').props.errors).toEqual({title: 'Already taken'});

            jest.mocked(doBlockAction).mockResolvedValue({data: {}});
            await act(async () => {
                await getByTestId('block-renderer').props.onAction({actionId: 'submit_action', subtype: 'submit'});
            });

            expect(getByTestId('block-renderer').props.errors).toEqual({});
        });

        it('should run the cancel action when the cancel button is pressed', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps()}/>,
            );

            await act(async () => {
                fireEvent.press(getByTestId('interactive_dialog.cancel.button'));
            });

            expect(doBlockAction).toHaveBeenCalledWith(SERVER_URL, expect.objectContaining({
                action_id: 'cancel_action',
                form_values: undefined,
            }));
        });

        it('should close without a request when cancel has no action', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps({blockCancel: {label: 'Close'}})}/>,
            );

            await act(async () => {
                fireEvent.press(getByTestId('interactive_dialog.cancel.button'));
            });

            expect(doBlockAction).not.toHaveBeenCalled();
            expect(navigateBack).toHaveBeenCalled();
        });

        it('should close without a request when submit has no action and the form is valid', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps({blockSubmit: {label: 'Done'}})}/>,
            );

            await act(async () => {
                fireEvent.press(getByTestId('interactive_dialog.submit.button'));
            });

            expect(doBlockAction).not.toHaveBeenCalled();
            expect(navigateBack).toHaveBeenCalled();
        });

        it('should not close when submit has no action and the form is invalid', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...nativeProps({
                        blockSubmit: {label: 'Done'},
                        mmBlocks: [{type: 'text_input', name: 'title', label: 'Title'}],
                    })}
                />,
            );

            await act(async () => {
                fireEvent.press(getByTestId('interactive_dialog.submit.button'));
            });

            expect(navigateBack).not.toHaveBeenCalled();
            expect(getByTestId('block-renderer').props.errors).toEqual({title: 'This field is required.'});
        });

        it('should keep only the newest blocks when actions resolve out of order', async () => {
            const deferred: Array<(value: {data: DoBlockActionResponse}) => void> = [];
            jest.mocked(doBlockAction).mockImplementation(() => new Promise((resolve) => {
                deferred.push(resolve);
            }));

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...nativeProps({
                        mmBlocks: [{type: 'text_input', name: 'title', label: 'Title', onChange: 'title'}],
                    })}
                />,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                onAction({actionId: 'title', formValues: {title: 'A'}});
                onAction({actionId: 'title', formValues: {title: 'AB'}});
            });

            await act(async () => {
                deferred[1]({
                    data: {type: 'refresh', block_dialog: {title: 'Newest', blocks: [{type: 'text', text: 'Newest'}]}},
                });
                deferred[0]({
                    data: {type: 'refresh', block_dialog: {title: 'Stale', blocks: [{type: 'text', text: 'Stale'}]}},
                });
            });

            expect(getByTestId('block-renderer').props.blocks).toEqual([{type: 'text', text: 'Newest'}]);
        });

        it('should look up dynamic select options through doBlockAction', async () => {
            const items = [{text: 'Bug', value: 'bug'}];
            jest.mocked(doBlockAction).mockResolvedValue({data: {items}});

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps()}/>,
            );

            const onLookup: LookupHandler = getByTestId('block-renderer').props.onLookup;
            await act(async () => {
                expect(await onLookup('lookup_action', 'bu', {title: 'Bug'})).toEqual(items);
            });

            expect(doBlockAction).toHaveBeenCalledWith(SERVER_URL, {
                subtype: 'lookup',
                context: 'dialog',
                post_id: '',
                channel_id: CHANNEL_ID,
                action_id: 'lookup_action',
                cookie: COOKIE,
                query: {query: 'bu'},
                form_values: {title: 'Bug'},
                integration_format: 'mm_block',
            });
        });

        it('should return no lookup options when the response has none', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps()}/>,
            );

            const onLookup: LookupHandler = getByTestId('block-renderer').props.onLookup;
            await act(async () => {
                expect(await onLookup('lookup_action', 'bu')).toEqual([]);
            });
        });

        it('should block submitting while a file upload is in flight', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...nativeProps()}/>,
            );

            act(() => {
                getByTestId('block-renderer').props.onUploadingChange(true);
                getByTestId('block-renderer').props.onUploadingChange(true);
            });

            expect(getByTestId('interactive_dialog.submit.button')).toBeDisabled();

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'submit_action', formValues: {}, subtype: 'submit'});
            });

            expect(doBlockAction).not.toHaveBeenCalled();
            expect(getByTestId('interactive_dialog.error')).toHaveTextContent(/Please wait for file uploads to finish/);

            act(() => {
                getByTestId('block-renderer').props.onUploadingChange(false);
            });

            await act(async () => {
                fireEvent.press(getByTestId('interactive_dialog.submit.button'));
            });

            expect(doBlockAction).toHaveBeenCalled();
        });
    });

    describe('legacy mode', () => {
        it('should convert dialog elements into blocks and render submit and cancel in the footer', () => {
            const {getByTestId, getByText, queryByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...legacyProps()}/>,
            );

            const renderer = getByTestId('block-renderer');
            expect(renderer.props.omitForm).toBe(true);
            expect(renderer.props.blocks).toEqual([
                {type: 'text', text: 'Fill this out'},
                expect.objectContaining({type: 'text_input', name: 'name', label: 'Name'}),
            ]);
            expect(renderer.props.blocks.some((b: MmBlock) => b.type === 'button' && 'action_id' in b && b.action_id === DIALOG_SUBMIT_ACTION_ID)).toBe(false);
            expect(getByText('Cancel')).toBeTruthy();
            expect(getByText('Go')).toBeTruthy();
            expect(getByTestId('interactive_dialog.submit.button')).toBeTruthy();
            expect(queryByTestId('interactive_dialog.cancel.button')).toBeTruthy();
        });

        it('should submit the dialog through submitInteractiveDialog', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...legacyProps({
                        elements: [
                            dialogElement(),
                            dialogElement({name: 'tags', type: 'select', multiselect: true, optional: true}),
                        ],
                    })}
                />,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({
                    actionId: DIALOG_SUBMIT_ACTION_ID,
                    formValues: {
                        name: 'Ada',
                        tags: ['a', 'b'],
                    },
                });
            });

            expect(submitInteractiveDialog).toHaveBeenCalledWith(SERVER_URL, {
                url: 'https://example.com/dialog',
                callback_id: 'callback-1',
                state: 'legacy-state',
                submission: {name: 'Ada', tags: 'a,b'},
                user_id: '',
                channel_id: CHANNEL_ID,
                team_id: '',
                cancelled: false,
            });
            expect(navigateBack).toHaveBeenCalled();
        });

        it('should send the file ids collected from file elements', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...legacyProps({
                        elements: [dialogElement({name: 'attachment', type: 'file'})],
                    })}
                />,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({
                    actionId: DIALOG_SUBMIT_ACTION_ID,
                    formValues: {
                        attachment: ['file-1', 'file-2'],
                    },
                });
            });

            expect(submitInteractiveDialog).toHaveBeenCalledWith(SERVER_URL, expect.objectContaining({
                file_ids: ['file-1', 'file-2'],
            }));
        });

        it('should cap the submitted file ids at the dialog limit', async () => {
            const fileIds = Array.from({length: 12}, (_, index) => `file-${index}`);
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...legacyProps({
                        elements: [dialogElement({name: 'attachment', type: 'file'})],
                    })}
                />,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: DIALOG_SUBMIT_ACTION_ID, formValues: {attachment: fileIds}});
            });

            expect(jest.mocked(submitInteractiveDialog).mock.calls[0][1].file_ids).toEqual(fileIds.slice(0, 10));
        });

        it('should not submit when client validation fails', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...legacyProps()}/>,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: DIALOG_SUBMIT_ACTION_ID, formValues: {name: ''}});
            });

            expect(submitInteractiveDialog).not.toHaveBeenCalled();
            expect(getByTestId('block-renderer').props.errors).toEqual({name: 'This field is required.'});
        });

        it('should show a submission error when the request fails', async () => {
            jest.mocked(submitInteractiveDialog).mockResolvedValue({error: new Error('boom')});

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...legacyProps()}/>,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: DIALOG_SUBMIT_ACTION_ID, formValues: {name: 'Ada'}});
            });

            expect(getByTestId('interactive_dialog.error')).toHaveTextContent(/Submission failed/);
            expect(navigateBack).not.toHaveBeenCalled();
        });

        it('should show the error returned by the integration', async () => {
            jest.mocked(submitInteractiveDialog).mockResolvedValue({data: {error: 'Not allowed'}});

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...legacyProps()}/>,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: DIALOG_SUBMIT_ACTION_ID, formValues: {name: 'Ada'}});
            });

            expect(getByTestId('interactive_dialog.error')).toHaveTextContent(/Not allowed/);
        });

        it('should replace the form when the response returns a new one', async () => {
            jest.mocked(submitInteractiveDialog).mockResolvedValue({
                data: {
                    type: 'form',
                    form: {
                        title: 'Step 2',
                        introduction_text: 'Almost done',
                        submit_label: 'Finish',
                        elements: [dialogElement({name: 'reason', display_name: 'Reason'})],
                        state: 'state-2',
                        source_url: 'https://example.com/refresh-2',
                    },
                },
            });

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...legacyProps()}/>,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: DIALOG_SUBMIT_ACTION_ID, formValues: {name: 'Ada'}});
            });

            expect(getByTestId('block-renderer').props.blocks).toEqual([
                {type: 'text', text: 'Almost done'},
                expect.objectContaining({type: 'text_input', name: 'reason'}),
            ]);
            expect(getByTestId('interactive_dialog.submit.button')).toHaveTextContent('Finish');
            expect(navigateBack).not.toHaveBeenCalled();
        });

        it('should set the field errors returned by the submission', async () => {
            jest.mocked(submitInteractiveDialog).mockResolvedValue({
                data: {errors: {name: 'Already used'}},
            });

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...legacyProps()}/>,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: DIALOG_SUBMIT_ACTION_ID, formValues: {name: 'Ada'}});
            });

            expect(getByTestId('block-renderer').props.errors).toEqual({name: 'Already used'});
            expect(navigateBack).not.toHaveBeenCalled();
        });

        it('should refresh the form when a refresh field changes', async () => {
            jest.mocked(submitInteractiveDialog).mockResolvedValue({
                data: {
                    type: 'form',
                    form: {
                        title: 'Legacy Dialog',
                        elements: [dialogElement({name: 'name', refresh: true}), dialogElement({name: 'city'})],
                    },
                },
            });

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...legacyProps({
                        elements: [dialogElement({name: 'name', refresh: true})],
                        sourceUrl: 'https://example.com/refresh',
                    })}
                />,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'name', formValues: {name: 'Ada'}});
            });

            expect(submitInteractiveDialog).toHaveBeenCalledWith(SERVER_URL, expect.objectContaining({
                url: 'https://example.com/refresh',
                type: 'refresh',
                submission: {name: 'Ada', selected_field: 'name'},
            }));
            expect(getByTestId('block-renderer').props.blocks).toHaveLength(2);
        });

        it('should ignore refreshes when the dialog has no source url', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...legacyProps({elements: [dialogElement({name: 'name', refresh: true})]})}/>,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'name', formValues: {name: 'Ada'}});
            });

            expect(submitInteractiveDialog).not.toHaveBeenCalled();
        });

        it('should ignore changes on fields that are not refresh fields', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...legacyProps({sourceUrl: 'https://example.com/refresh'})}/>,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'name', formValues: {name: 'Ada'}});
            });

            expect(submitInteractiveDialog).not.toHaveBeenCalled();
        });

        it('should show a refresh error when the refresh request fails', async () => {
            jest.mocked(submitInteractiveDialog).mockResolvedValue({error: new Error('boom')});

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...legacyProps({
                        elements: [dialogElement({name: 'name', refresh: true})],
                        sourceUrl: 'https://example.com/refresh',
                    })}
                />,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'name', formValues: {name: 'Ada'}});
            });

            expect(getByTestId('interactive_dialog.error')).toHaveTextContent(/Failed to refresh form fields/);
        });

        it('should show the error a refresh response returns', async () => {
            jest.mocked(submitInteractiveDialog).mockResolvedValue({data: {error: 'Cannot refresh'}});

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...legacyProps({
                        elements: [dialogElement({name: 'name', refresh: true})],
                        sourceUrl: 'https://example.com/refresh',
                    })}
                />,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'name', formValues: {name: 'Ada'}});
            });

            expect(getByTestId('interactive_dialog.error')).toHaveTextContent(/Cannot refresh/);
        });

        it('should set the field errors a refresh response returns', async () => {
            jest.mocked(submitInteractiveDialog).mockResolvedValue({data: {errors: {name: 'Unknown user'}}});

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...legacyProps({
                        elements: [dialogElement({name: 'name', refresh: true})],
                        sourceUrl: 'https://example.com/refresh',
                    })}
                />,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'name', formValues: {name: 'Ada'}});
            });

            expect(getByTestId('block-renderer').props.errors).toEqual({name: 'Unknown user'});
        });

        it('should keep only the newest form when refreshes resolve out of order', async () => {
            const deferred: Array<(value: {data: SubmitDialogResponse}) => void> = [];
            jest.mocked(submitInteractiveDialog).mockImplementation(() => new Promise((resolve) => {
                deferred.push(resolve);
            }));

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...legacyProps({
                        elements: [dialogElement({name: 'name', refresh: true})],
                        sourceUrl: 'https://example.com/refresh',
                        introductionText: undefined,
                        submitLabel: undefined,
                    })}
                />,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                onAction({actionId: 'name', formValues: {name: 'A'}});
                onAction({actionId: 'name', formValues: {name: 'AB'}});
            });

            await act(async () => {
                deferred[1]({data: {type: 'form', form: {title: 'Newest', elements: [dialogElement({name: 'newest'})]}}});
                deferred[0]({data: {type: 'form', form: {title: 'Stale', elements: [dialogElement({name: 'stale'})]}}});
            });

            expect(getByTestId('block-renderer').props.blocks).toEqual([
                expect.objectContaining({type: 'text_input', name: 'newest'}),
            ]);
        });

        it('should execute legacy action buttons against the action url', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...legacyProps()}/>,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({
                    actionId: 'do_thing',
                    query: {
                        __dialog_action_button: '1',
                        __dialog_action_url: '/plugins/foo/action',
                        some: 'value',
                    },
                });
            });

            expect(executeDialogAction).toHaveBeenCalledWith(SERVER_URL, '/plugins/foo/action', {some: 'value'});
        });

        it('should show an error when a legacy action button fails', async () => {
            jest.mocked(executeDialogAction).mockResolvedValue({error: new Error('boom')});

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...legacyProps()}/>,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({
                    actionId: 'do_thing',
                    query: {
                        __dialog_action_button: '1',
                        __dialog_action_url: '/plugins/foo/action',
                    },
                });
            });

            expect(getByTestId('interactive_dialog.error')).toHaveTextContent(/Action failed to execute/);
        });

        it('should skip legacy action buttons without an action url', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...legacyProps()}/>,
            );

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: 'do_thing', query: {__dialog_action_button: '1'}});
            });

            expect(executeDialogAction).not.toHaveBeenCalled();
        });

        it('should notify the integration when cancelling a dialog with notify_on_cancel', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...legacyProps({notifyOnCancel: true})}/>,
            );

            await act(async () => {
                fireEvent.press(getByTestId('interactive_dialog.cancel.button'));
            });

            expect(submitInteractiveDialog).toHaveBeenCalledWith(SERVER_URL, expect.objectContaining({
                cancelled: true,
                submission: {},
            }));
            expect(navigateBack).toHaveBeenCalled();
        });

        it('should close without notifying the integration when cancelling', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell {...legacyProps()}/>,
            );

            await act(async () => {
                fireEvent.press(getByTestId('interactive_dialog.cancel.button'));
            });

            expect(submitInteractiveDialog).not.toHaveBeenCalled();
            expect(navigateBack).toHaveBeenCalled();
        });

        it('should look up options through lookupInteractiveDialog', async () => {
            const items = [{text: 'Bug', value: 'bug'}];
            jest.mocked(lookupInteractiveDialog).mockResolvedValue({data: {items}});

            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...legacyProps({
                        elements: [dialogElement({
                            name: 'choice',
                            type: 'select',
                            data_source: 'dynamic',
                            data_source_url: 'https://example.com/lookup',
                        })],
                    })}
                />,
            );

            const onLookup: LookupHandler = getByTestId('block-renderer').props.onLookup;
            await act(async () => {
                expect(await onLookup('choice', 'bu', {name: 'Ada'})).toEqual(items);
            });

            expect(lookupInteractiveDialog).toHaveBeenCalledWith(SERVER_URL, expect.objectContaining({
                url: 'https://example.com/lookup',
                submission: {name: 'Ada', query: 'bu', selected_field: 'choice'},
            }));
        });

        it.each([
            'http://localhost:8065/dialog',
            'http://127.0.0.1:8065/dialog',
            '/plugins/foo/lookup',
        ])('should allow lookups over the trusted url %s', async (url) => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...legacyProps({url, elements: [dialogElement({name: 'choice', type: 'select'})]})}
                />,
            );

            const onLookup: LookupHandler = getByTestId('block-renderer').props.onLookup;
            await act(async () => {
                await onLookup('choice', 'bu');
            });

            expect(lookupInteractiveDialog).toHaveBeenCalledWith(SERVER_URL, expect.objectContaining({url}));
        });

        it.each([
            undefined,
            'http://evil.example.com/dialog',
            'http://',
            'ftp://example.com/lookup',
            '/plugins/foo/../admin',
            '/plugins//foo/lookup',
        ])('should reject lookups over the untrusted url %s', async (url) => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...legacyProps({url, elements: [dialogElement({name: 'choice', type: 'select'})]})}
                />,
            );

            const onLookup: LookupHandler = getByTestId('block-renderer').props.onLookup;
            await act(async () => {
                expect(await onLookup('choice', 'bu')).toEqual([]);
            });

            expect(lookupInteractiveDialog).not.toHaveBeenCalled();
        });

        it('should block submitting while a file upload is in flight', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...legacyProps({elements: [dialogElement({name: 'attachment', type: 'file'})]})}
                />,
            );

            act(() => {
                getByTestId('block-renderer').props.onUploadingChange(true);
            });

            const onAction: ActionHandler = getByTestId('block-renderer').props.onAction;
            await act(async () => {
                await onAction({actionId: DIALOG_SUBMIT_ACTION_ID, formValues: {attachment: ['file-1']}});
            });

            expect(submitInteractiveDialog).not.toHaveBeenCalled();
            expect(getByTestId('interactive_dialog.error')).toHaveTextContent(/Please wait for file uploads to finish/);
        });

        it('should still notify on cancel while a file upload is in flight', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <BlocksDialogShell
                    {...legacyProps({
                        notifyOnCancel: true,
                        elements: [dialogElement({name: 'attachment', type: 'file'})],
                    })}
                />,
            );

            act(() => {
                getByTestId('block-renderer').props.onUploadingChange(true);
            });

            await act(async () => {
                fireEvent.press(getByTestId('interactive_dialog.cancel.button'));
            });

            expect(submitInteractiveDialog).toHaveBeenCalledWith(SERVER_URL, expect.objectContaining({cancelled: true}));
        });
    });
});
