// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';

import {observeCanUploadFiles} from '@queries/servers/security';

import AppsFormFileField from './apps_form_file_field';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    canUploadFiles: observeCanUploadFiles(database),
}));

export default React.memo(withDatabase(enhanced(AppsFormFileField)));
