// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {logDebug} from '@utils/log';

import BlocksDialogShell from './blocks_dialog_shell';

import type {DialogRouterProps} from './dialog_router';

export const BlocksDialogRouter = React.memo<DialogRouterProps>(({config}) => {
    if (!config || typeof config !== 'object') {
        logDebug('[BlocksDialogRouter] invalid or missing config payload');
        return null;
    }

    const blockDialog = config.block_dialog;
    const dialog = config.dialog;

    // WS / action payloads are JSON-cast; require a real array before native mode.
    const mmBlocks = Array.isArray(blockDialog?.blocks) ? blockDialog.blocks : undefined;
    const hasMmBlocks = Boolean(mmBlocks?.length);
    const hasUrl = Boolean(config.url);
    const hasContent = hasMmBlocks || hasUrl;

    if (!hasContent) {
        logDebug('[BlocksDialogRouter] missing block_dialog blocks and url — nothing to render');
        return null;
    }

    if (hasMmBlocks) {
        return (
            <BlocksDialogShell
                mode='native'
                title={blockDialog?.title}
                notifyOnCancel={blockDialog?.notify_on_cancel}
                state={blockDialog?.state}
                channelId={config.channel_id}
                mmBlocks={mmBlocks}
                mmBlocksActions={typeof blockDialog?.actions === 'string' ? blockDialog.actions : undefined}
                blockSubmit={blockDialog?.submit}
                blockCancel={blockDialog?.cancel}
            />
        );
    }

    if (!hasUrl) {
        logDebug('[BlocksDialogRouter] missing dialog url — nothing to render');
        return null;
    }

    return (
        <BlocksDialogShell
            mode='legacy'
            url={config.url}
            callbackId={dialog?.callback_id}
            elements={dialog?.elements}
            title={dialog?.title}
            introductionText={dialog?.introduction_text}
            submitLabel={dialog?.submit_label}
            notifyOnCancel={dialog?.notify_on_cancel}
            state={dialog?.state}
            sourceUrl={dialog?.source_url}
            channelId={config.channel_id}
        />
    );
});

BlocksDialogRouter.displayName = 'BlocksDialogRouter';

export default BlocksDialogRouter;
