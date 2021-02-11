// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid} from '@support/utils';

class BottomSheet {
    // bottom sheet titles
    showTitle = isAndroid() ? element(by.text('Show')) : element(by.label('Show')).atIndex(0);

    // bottom sheet options
    archivedChannelsOption = isAndroid() ? element(by.text('Archived Channels')) : element(by.label('Archived Channels')).atIndex(0);
    cancelOption = isAndroid() ? element(by.text('Cancel')) : element(by.label('Cancel')).atIndex(0);
    publicChannelsOption = isAndroid() ? element(by.text('Public Channels')) : element(by.label('Public Channels')).atIndex(0);
}

const bottomSheet = new BottomSheet();
export default bottomSheet;
