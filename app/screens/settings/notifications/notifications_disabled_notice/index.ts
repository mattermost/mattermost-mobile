// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import NotificationsDisabledNotice from './notifications_disabled_notice';

const enhanced = withObservables([], () => {
    return {};
});

export default withDatabase(enhanced(NotificationsDisabledNotice));
