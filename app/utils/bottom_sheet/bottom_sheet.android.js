// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {store} from 'app/mattermost';
import {showModalOverCurrentContext} from 'app/actions/navigation';

export default {
    showBottomSheetWithOptions: (options, callback) => {
        function itemAction(index) {
            callback(index);
        }

        const items = options.options.splice(0, options.cancelButtonIndex).map((o, index) => ({
            action: () => itemAction(index),
            text: o,
        }));

        store.dispatch(showModalOverCurrentContext('OptionsModal', {title: '', items}));
    },
};
