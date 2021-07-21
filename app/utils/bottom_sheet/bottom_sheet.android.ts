// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {showModalOverCurrentContext} from '@screens/navigation';

export default {
    showBottomSheetWithOptions: (options: { options: string[]; cancelButtonIndex: number }, callback: (buttonIndex: number) => void) => {
        function itemAction(index: number) {
            callback(index);
        }

        const items = options.options.splice(0, options.cancelButtonIndex).map((o, index) => ({
            action: () => itemAction(index),
            text: o,
        }));

        showModalOverCurrentContext('OptionsModal', {title: '', items});
    },
};
