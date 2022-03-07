// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as Screens from '@constants/screens';
import {showModal} from '@screens/navigation';

export const switchToThread = async (_serverUrl: string, rootId: string) => {
    showModal(Screens.THREAD, '', {rootId});
};
