// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';

import {observeConfigBooleanValue} from '@queries/servers/system';

import Markdown from './markdown';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const enableLatex = observeConfigBooleanValue(database, 'EnableLatex');
    const enableInlineLatex = observeConfigBooleanValue(database, 'EnableInlineLatex');

    return {
        enableLatex,
        enableInlineLatex,
    };
});

export default React.memo(withDatabase(enhanced(Markdown)));
