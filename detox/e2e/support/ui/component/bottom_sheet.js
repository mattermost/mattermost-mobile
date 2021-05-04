// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid} from '@support/utils';

class BottomSheet {
    // bottom sheet titles
    showTitle = isAndroid() ? element(by.text('Show')) : element(by.label('Show')).atIndex(0);

    // bottom sheet options
    archivedChannelsOption = isAndroid() ? element(by.text('Archived Channels')) : element(by.label('Archived Channels')).atIndex(0);
    awayOption = isAndroid() ? element(by.text('Away')) : element(by.label('Away')).atIndex(0);
    cancelOption = isAndroid() ? element(by.text('Cancel')) : element(by.label('Cancel')).atIndex(0);
    copyHeaderOption = isAndroid() ? element(by.text('Copy Header')) : element(by.label('Copy Header')).atIndex(0);
    copyPurposeOption = isAndroid() ? element(by.text('Copy Purpose')) : element(by.label('Copy Purpose')).atIndex(0);
    copyUrlOption = isAndroid() ? element(by.text('Copy URL')) : element(by.label('Copy URL')).atIndex(0);
    doNotDisturbOption = isAndroid() ? element(by.text('Do Not Disturb')) : element(by.label('Do No Disturb')).atIndex(0);
    offlineOption = isAndroid() ? element(by.text('Offline')) : element(by.label('Offline')).atIndex(0);
    onlineOption = isAndroid() ? element(by.text('Online')) : element(by.label('Online')).atIndex(0);
    publicChannelsOption = isAndroid() ? element(by.text('Public Channels')) : element(by.label('Public Channels')).atIndex(0);
}

const bottomSheet = new BottomSheet();
export default bottomSheet;
