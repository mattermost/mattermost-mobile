// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';

import AppsManager from '@managers/apps_manager';

import Autocomplete from './autocomplete';

type OwnProps = {
    serverUrl?: string;
}

const enhanced = withObservables(['serverUrl'], ({serverUrl}: OwnProps) => ({
    isAppsEnabled: serverUrl ? AppsManager.observeIsAppsEnabled(serverUrl) : false,
}));

export default enhanced(Autocomplete);
