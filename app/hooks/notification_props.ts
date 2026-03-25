// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useMemo} from 'react';

import {getNotificationProps} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

function useNotificationProps(currentUser?: UserModel) {
    // We need to depend on the notifyProps object directly,
    // since changes in it may not be reflected in the currentUser object
    // (it is still the same object reference).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => getNotificationProps(currentUser), [currentUser?.notifyProps]);
}

export default useNotificationProps;
