// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';

import {observeConfigBooleanValue, observeConfigIntValue, observeConfigValue} from '@queries/servers/system';

import Markdown from './markdown';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const enableLatex = observeConfigBooleanValue(database, 'EnableLatex');
    const enableInlineLatex = observeConfigBooleanValue(database, 'EnableInlineLatex');
    const maxNodes = observeConfigIntValue(database, 'MaxMarkdownNodes');
    const minimumHashtagLength = observeConfigIntValue(database, 'MinimumHashtagLength');
    const customUrlSchemesValue = observeConfigValue(database, 'CustomUrlSchemes');

    return {
        enableLatex,
        enableInlineLatex,
        maxNodes,
        minimumHashtagLength,
        customUrlSchemes: customUrlSchemesValue.pipe(
            (schemes) => (schemes ? schemes.split(',').map((s) => s.trim()) : []),
        ),
    };
});

export default withDatabase(enhanced(React.memo(Markdown)));
