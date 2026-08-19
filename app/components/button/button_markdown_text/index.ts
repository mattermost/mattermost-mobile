// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';

import {observeConfigIntValue} from '@queries/servers/system';

import ButtonMarkdownText from './button_markdown_text';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const maxNodes = observeConfigIntValue(database, 'MaxMarkdownNodes');

    return {
        maxNodes,
    };
});

export default withDatabase(enhanced(React.memo(ButtonMarkdownText)));
