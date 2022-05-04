// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeConfig} from '@queries/servers/system';

import Markdown from './markdown';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const config = observeConfig(database);
    const enableLatex = config.pipe(switchMap((c) => of$(c?.EnableLatex === 'true')));
    const enableInlineLatex = config.pipe(switchMap((c) => of$(c?.EnableInlineLatex === 'true')));

    return {
        enableLatex,
        enableInlineLatex,
    };
});

export default React.memo(withDatabase(enhanced(Markdown)));
