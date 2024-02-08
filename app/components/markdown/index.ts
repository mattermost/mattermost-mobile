// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';

import {observeConfigBooleanValue, observeConfigIntValue} from '@queries/servers/system';

import Markdown from './markdown';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const enableLatex = observeConfigBooleanValue(database, 'EnableLatex');
    const enableInlineLatex = observeConfigBooleanValue(database, 'EnableInlineLatex');
    const maxNodes = observeConfigIntValue(database, 'MaxMarkdownNodes');

    return {
        enableLatex,
        enableInlineLatex,
        maxNodes,
    };
});

export default withDatabase(enhanced(React.memo(Markdown)));
