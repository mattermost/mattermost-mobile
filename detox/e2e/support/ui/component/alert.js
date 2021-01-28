// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid} from '@support/utils';

class Alert {
    // alert titles
    deletePostTitle = isAndroid() ? element(by.text('Delete Post')) : element(by.label('Delete Post')).atIndex(0);
    joinPrivateChannelTitle = isAndroid() ? element(by.text('Join private channel')) : element(by.label('Join private channel')).atIndex(0);

    // alert buttons
    cancelButton = isAndroid() ? element(by.text('CANCEL')) : element(by.label('Cancel')).atIndex(0);
    deleteButton = isAndroid() ? element(by.text('DELETE')) : element(by.label('Delete')).atIndex(0);
    joinButton = isAndroid() ? element(by.text('JOIN')) : element(by.label('Join')).atIndex(0);
}

const alert = new Alert();
export default alert;
