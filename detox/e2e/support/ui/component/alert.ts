// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid} from '@support/utils';

class Alert {
    // alert titles
    deletePostTitle = isAndroid() ? element(by.text('Delete Post')) : element(by.label('Delete Post')).atIndex(0);
    logoutTitle = (serverDisplayName: string) => {
        const title = `Are you sure you want to log out of ${serverDisplayName}?`;

        return isAndroid() ? element(by.text(title)) : element(by.label(title)).atIndex(0);
    };
    markAllAsReadTitle = isAndroid() ? element(by.text('Are you sure you want to mark all threads as read?')) : element(by.label('Are you sure you want to mark all threads as read?')).atIndex(0);
    messageLengthTitle = isAndroid() ? element(by.text('Message Length')) : element(by.label('Message Length')).atIndex(0);
    removeServerTitle = (serverDisplayName: string) => {
        const title = `Are you sure you want to remove ${serverDisplayName}?`;

        return isAndroid() ? element(by.text(title)) : element(by.label(title)).atIndex(0);
    };

    // alert buttons
    cancelButton = isAndroid() ? element(by.text('CANCEL')) : element(by.label('Cancel')).atIndex(1);
    deleteButton = isAndroid() ? element(by.text('DELETE')) : element(by.label('Delete')).atIndex(0);
    logoutButton = isAndroid() ? element(by.text('LOG OUT')) : element(by.label('Log out')).atIndex(1);
    markReadButton = isAndroid() ? element(by.text('MARK READ')) : element(by.label('Mark read')).atIndex(1);
    okButton = isAndroid() ? element(by.text('OK')) : element(by.label('OK')).atIndex(1);
    removeButton = isAndroid() ? element(by.text('REMOVE')) : element(by.label('Remove')).atIndex(1);
}

const alert = new Alert();
export default alert;
