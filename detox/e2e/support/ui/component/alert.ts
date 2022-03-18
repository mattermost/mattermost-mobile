// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid} from '@support/utils';

class Alert {
    // alert titles
    logoutTitle = (serverDisplayName: string) => {
        const title = `Are you sure you want to log out of ${serverDisplayName}?`;

        return isAndroid() ? element(by.text(title)) : element(by.label(title)).atIndex(0);
    };

    // alert buttons
    cancelButton = isAndroid() ? element(by.text('CANCEL')) : element(by.label('Cancel')).atIndex(1);
    logoutButton = isAndroid() ? element(by.text('LOG OUT')) : element(by.label('Log out')).atIndex(1);
}

const alert = new Alert();
export default alert;
