// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *********************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use accessibility ID when selecting an element. Create one if none.
// *********************************************************************

import PostTextbox from '../../screen_objects/components/post_textbox';
import {login} from '../../utils/ui_commands';

describe('Messaging', () => {
    before(() => {
        login('user-1');
    });

    it('should be able to post a message', () => {
        browser.pause(2000);

        // * Check if textbox is shown
        PostTextbox.waitForIsShown(true);

        // # Enter a test message
        PostTextbox.textInput.setValue('test message ' + Date.now());

        // # Click send button to post a message
        const location = PostTextbox.sendButton.getLocation();
        browser.touchAction({action: 'tap', x: location.x, y: location.y});
    });
});
