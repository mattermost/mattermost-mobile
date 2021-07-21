// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionSheetIOS, ActionSheetIOSOptions} from 'react-native';

export default {
    showBottomSheetWithOptions: (options: ActionSheetIOSOptions, callback: (buttonIndex: number) => void) => {
        return ActionSheetIOS.showActionSheetWithOptions(options, callback);
    },
};
