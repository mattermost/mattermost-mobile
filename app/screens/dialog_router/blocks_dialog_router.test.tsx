// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render} from '@testing-library/react-native';
import React from 'react';

import {BlocksDialogRouter} from './blocks_dialog_router';

import type {BlocksDialogShellProps} from './blocks_dialog_shell';

jest.mock('./blocks_dialog_shell', () => {
    const mockReact = require('react');
    const mockFn = jest.fn((props: BlocksDialogShellProps) => mockReact.createElement('View', {testID: `blocks-dialog-shell-${props.mode}`}));
    return {
        __esModule: true,
        default: mockFn,
    };
});

const mockBlocksDialogShell = require('./blocks_dialog_shell').default;

describe('BlocksDialogRouter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render nothing when config has neither block_dialog blocks nor a url', () => {
        const config: InteractiveDialogConfig = {trigger_id: 'trigger'};

        const {toJSON} = render(<BlocksDialogRouter config={config}/>);

        expect(toJSON()).toBeNull();
        expect(mockBlocksDialogShell).not.toHaveBeenCalled();
    });

    it('should render nothing when block_dialog has no blocks and there is no url', () => {
        const config: InteractiveDialogConfig = {
            trigger_id: 'trigger',
            block_dialog: {title: 'Empty', blocks: []},
        };

        const {toJSON} = render(<BlocksDialogRouter config={config}/>);

        expect(toJSON()).toBeNull();
        expect(mockBlocksDialogShell).not.toHaveBeenCalled();
    });

    it('should ignore non-array block_dialog.blocks and render nothing without a url', () => {
        const config = {
            trigger_id: 'trigger',
            block_dialog: {title: 'Broken', blocks: 'not-an-array'},
        } as unknown as InteractiveDialogConfig;

        const {toJSON} = render(<BlocksDialogRouter config={config}/>);

        expect(toJSON()).toBeNull();
        expect(mockBlocksDialogShell).not.toHaveBeenCalled();
    });

    it('should fall back to legacy mode when block_dialog.blocks is not an array but a url is present', () => {
        const config = {
            trigger_id: 'trigger',
            url: 'https://example.com/dialog',
            dialog: {title: 'Legacy', elements: []},
            block_dialog: {title: 'Broken', blocks: {type: 'text'}},
        } as unknown as InteractiveDialogConfig;

        const {getByTestId} = render(<BlocksDialogRouter config={config}/>);

        expect(getByTestId('blocks-dialog-shell-legacy')).toBeTruthy();
    });

    it('should render BlocksDialogShell in native mode when block_dialog has blocks', () => {
        const config: InteractiveDialogConfig = {
            trigger_id: 'trigger',
            channel_id: 'channel-1',
            block_dialog: {
                title: 'Native Dialog',
                icon_url: 'https://example.com/icon.png',
                notify_on_cancel: true,
                state: 'some-state',
                blocks: [{type: 'text', text: 'Hello'}],
                submit: {label: 'Save', action: 'submit_action'},
                cancel: {label: 'Discard', action: 'cancel_action'},
                actions: 'encrypted-cookie',
            },
        };

        const {getByTestId} = render(<BlocksDialogRouter config={config}/>);

        expect(getByTestId('blocks-dialog-shell-native')).toBeTruthy();
        expect(mockBlocksDialogShell.mock.calls[0][0]).toEqual(
            expect.objectContaining({
                mode: 'native',
                title: 'Native Dialog',
                notifyOnCancel: true,
                state: 'some-state',
                channelId: 'channel-1',
                mmBlocks: [{type: 'text', text: 'Hello'}],
                mmBlocksActions: 'encrypted-cookie',
                blockSubmit: {label: 'Save', action: 'submit_action'},
                blockCancel: {label: 'Discard', action: 'cancel_action'},
            }),
        );
    });

    it('should render BlocksDialogShell in legacy mode when there is a url but no block_dialog blocks', () => {
        const config: InteractiveDialogConfig = {
            trigger_id: 'trigger',
            channel_id: 'channel-1',
            url: 'https://example.com/dialog',
            dialog: {
                callback_id: 'callback-1',
                title: 'Legacy Dialog',
                introduction_text: 'Please fill this out',
                elements: [],
                submit_label: 'Go',
                notify_on_cancel: false,
                state: 'legacy-state',
                source_url: 'https://example.com/refresh',
            },
        };

        const {getByTestId} = render(<BlocksDialogRouter config={config}/>);

        expect(getByTestId('blocks-dialog-shell-legacy')).toBeTruthy();
        expect(mockBlocksDialogShell.mock.calls[0][0]).toEqual(
            expect.objectContaining({
                mode: 'legacy',
                url: 'https://example.com/dialog',
                callbackId: 'callback-1',
                elements: [],
                title: 'Legacy Dialog',
                introductionText: 'Please fill this out',
                submitLabel: 'Go',
                notifyOnCancel: false,
                state: 'legacy-state',
                sourceUrl: 'https://example.com/refresh',
                channelId: 'channel-1',
            }),
        );
    });

    it('should prefer native mode when both block_dialog blocks and a legacy url are present', () => {
        const config: InteractiveDialogConfig = {
            trigger_id: 'trigger',
            url: 'https://example.com/dialog',
            dialog: {title: 'Legacy', elements: []},
            block_dialog: {title: 'Native', blocks: [{type: 'text', text: 'Hi'}]},
        };

        const {getByTestId} = render(<BlocksDialogRouter config={config}/>);

        expect(getByTestId('blocks-dialog-shell-native')).toBeTruthy();
    });
});
