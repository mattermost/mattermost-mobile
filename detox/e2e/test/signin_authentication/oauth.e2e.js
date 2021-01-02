// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {
    SelectServerScreen
} from '@support/ui/screen';

describe('Select Server', () => {
    const {
        connectButton,
        errorText,
        serverUrlInput,
    } = SelectServerScreen;

    beforeEach(async () => {
        await device.reloadReactNative();
    });


});
