// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AppScreen from './app_screen';

const SELECTORS = {
    CHANNEL_NAV_BAR: '~channel nav bar',
    CHANNEL_POST_LIST: '~channel post list',
    POST_TEXTBOX: '~post textbox',
};

class ChannelScreen extends AppScreen {
    constructor() {
        super(SELECTORS.CHANNEL_NAV_BAR);
    }

    get channelNavBar() {
        return $(SELECTORS.CHANNEL_NAV_BAR);
    }

    get channelPostList() {
        return $(SELECTORS.CHANNEL_POST_LIST);
    }

    get postTextbox() {
        return $(SELECTORS.POST_TEXTBOX);
    }

    editPostTextbox(text) {
        this.postTextbox.setValue(text);
    }
}

export default new ChannelScreen();
