// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid} from '@support/utils';

class Alert {
    // alert titles
    archivePrivateChannelTitle = isAndroid() ? element(by.text('Archive Private Channel')) : element(by.label('Archive Private Channel')).atIndex(0);
    archivePublicChannelTitle = isAndroid() ? element(by.text('Archive Public Channel')) : element(by.label('Archive Public Channel')).atIndex(0);
    deleteDocumentsAndDataTitle = isAndroid() ? element(by.text('Delete Documents & Data')) : element(by.label('Delete Documents & Data')).atIndex(0);
    deletePostTitle = isAndroid() ? element(by.text('Delete Post')) : element(by.label('Delete Post')).atIndex(0);
    joinPrivateChannelTitle = isAndroid() ? element(by.text('Join private channel')) : element(by.label('Join private channel')).atIndex(0);
    leavePrivateChannelTitle = isAndroid() ? element(by.text('Leave Private Channel')) : element(by.label('Leave Private Channel')).atIndex(0);
    leavePublicChannelTitle = isAndroid() ? element(by.text('Leave Public Channel')) : element(by.label('Leave Public Channel')).atIndex(0);
    removeMembersTitle = isAndroid() ? element(by.text('Remove Members')) : element(by.label('Remove Members')).atIndex(0);

    // alert buttons
    cancelButton = isAndroid() ? element(by.text('CANCEL')) : element(by.label('Cancel')).atIndex(1);
    deleteButton = isAndroid() ? element(by.text('DELETE')) : element(by.label('Delete')).atIndex(0);
    joinButton = isAndroid() ? element(by.text('JOIN')) : element(by.label('Join')).atIndex(0);
    okButton = isAndroid() ? element(by.text('OK')) : element(by.label('OK')).atIndex(1);
    noButton = isAndroid() ? element(by.text('NO')) : element(by.label('No')).atIndex(1);
    yesButton = isAndroid() ? element(by.text('YES')) : element(by.label('Yes')).atIndex(0);
}

const alert = new Alert();
export default alert;
