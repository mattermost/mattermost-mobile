// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid} from '@support/utils';

class Alert {
    // alert titles
    confirmSendingNotificationsTitle = isAndroid() ? element(by.text('Confirm sending notifications to entire channel')) : element(by.label('Confirm sending notifications to entire channel')).atIndex(0);
    archivePrivateChannelTitle = isAndroid() ? element(by.text('Archive Private Channel')) : element(by.label('Archive Private Channel')).atIndex(0);
    archivePublicChannelTitle = isAndroid() ? element(by.text('Archive Public Channel')) : element(by.label('Archive Public Channel')).atIndex(0);
    channelNowPrivateTitle = (channelDisplayName: string) => {
        const title = `${channelDisplayName} is now a private channel.`;

        return isAndroid() ? element(by.text(title)) : element(by.label(title)).atIndex(0);
    };
    convertToPrivateChannelTitle = (channelDisplayName: string) => {
        const title = `Convert ${channelDisplayName} to a private channel?`;

        return isAndroid() ? element(by.text(title)) : element(by.label(title)).atIndex(0);
    };
    deletePostTitle = isAndroid() ? element(by.text('Delete Post')) : element(by.label('Delete Post')).atIndex(0);
    invalidSslCertTitle = isAndroid() ? element(by.text('Invalid SSL certificate')) : element(by.label('Invalid SSL certificate')).atIndex(0);
    leaveChannelTitle = isAndroid() ? element(by.text('Leave channel')) : element(by.label('Leave channel')).atIndex(0);
    logoutTitle = (serverDisplayName: string) => {
        const title = `Are you sure you want to log out of ${serverDisplayName}?`;

        return isAndroid() ? element(by.text(title)) : element(by.label(title)).atIndex(0);
    };
    markAllAsReadTitle = isAndroid() ? element(by.text('Are you sure you want to mark all threads as read?')) : element(by.label('Are you sure you want to mark all threads as read?')).atIndex(0);
    messageLengthTitle = isAndroid() ? element(by.text('Message Length')) : element(by.label('Message Length')).atIndex(0);
    notificationsCannotBeReceivedTitle = isAndroid() ? element(by.text('Notifications cannot be received from this server')) : element(by.label('Notifications cannot be received from this server')).atIndex(0);
    removeServerTitle = (serverDisplayName: string) => {
        const title = `Are you sure you want to remove ${serverDisplayName}?`;

        return isAndroid() ? element(by.text(title)) : element(by.label(title)).atIndex(0);
    };
    unarchivePrivateChannelTitle = isAndroid() ? element(by.text('Unarchive Private Channel')) : element(by.label('Unarchive Private Channel')).atIndex(0);
    unarchivePublicChannelTitle = isAndroid() ? element(by.text('Unarchive Public Channel')) : element(by.label('Unarchive Public Channel')).atIndex(0);

    // alert buttons
    cancelButton = isAndroid() ? element(by.text('CANCEL')) : element(by.label('Cancel')).atIndex(1);
    confirmButton = isAndroid() ? element(by.text('CONFIRM')) : element(by.label('Confirm')).atIndex(1);
    deleteButton = isAndroid() ? element(by.text('DELETE')) : element(by.label('Delete')).atIndex(0);
    deleteScheduledMessageButton = isAndroid() ? element(by.text('DELETE')) : element(by.label('Delete')).atIndex(1);
    leaveButton = isAndroid() ? element(by.text('LEAVE')) : element(by.label('Leave')).atIndex(0);
    logoutButton = isAndroid() ? element(by.text('LOG OUT')) : element(by.label('Log out')).atIndex(1);
    logoutButton2 = isAndroid() ? element(by.text('LOG OUT')) : element(by.label('Log out')).atIndex(2);
    logoutButton3 = isAndroid() ? element(by.text('LOG OUT')) : element(by.label('Log out')).atIndex(3);
    markReadButton = isAndroid() ? element(by.text('MARK READ')) : element(by.label('Mark read')).atIndex(1);
    noButton = isAndroid() ? element(by.text('NO')) : element(by.label('No')).atIndex(0);
    noButton2 = isAndroid() ? element(by.text('NO')) : element(by.label('No')).atIndex(1);
    okButton = isAndroid() ? element(by.text('OK')) : element(by.label('OK')).atIndex(1);
    okayButton = isAndroid() ? element(by.text('Okay')) : element(by.label('Okay')).atIndex(1);
    removeButton = isAndroid() ? element(by.text('REMOVE')) : element(by.label('Remove')).atIndex(0);
    removeButton1 = isAndroid() ? element(by.text('REMOVE')) : element(by.label('Remove')).atIndex(1);
    removeButton2 = isAndroid() ? element(by.text('REMOVE')) : element(by.label('Remove')).atIndex(2);
    removeButton3 = isAndroid() ? element(by.text('REMOVE')) : element(by.label('Remove')).atIndex(3);
    yesButton = isAndroid() ? element(by.text('YES')) : element(by.label('Yes')).atIndex(0);
    yesButton2 = isAndroid() ? element(by.text('YES')) : element(by.label('Yes')).atIndex(1);
    sendButton = isAndroid() ? element(by.text('SEND')) : element(by.label('Send')).atIndex(1);
}

const alert = new Alert();
export default alert;
