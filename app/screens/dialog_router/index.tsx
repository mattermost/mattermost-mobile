// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';

import {observeBlockActionsEnabled} from '@queries/servers/features';

import {BlocksDialogRouter} from './blocks_dialog_router';
import {DialogRouter, type DialogRouterProps} from './dialog_router';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = DialogRouterProps & {
    blockActionsEnabled: boolean;
};

const DialogRouterScreen = ({config, blockActionsEnabled}: Props) => {
    // Blocks dialog UI requires FeatureFlagMmBlocksEnabled and BLOCK_ACTIONS_VERSION+.
    // Otherwise fall back to the Apps Form path.
    if (blockActionsEnabled) {
        return <BlocksDialogRouter config={config}/>;
    }

    return <DialogRouter config={config}/>;
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    blockActionsEnabled: observeBlockActionsEnabled(database),
}));

export default withDatabase(enhanced(DialogRouterScreen));
