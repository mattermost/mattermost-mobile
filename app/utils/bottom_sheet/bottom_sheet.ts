// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable @typescript-eslint/no-explicit-any */

import {showModalOverCurrentContext} from '@actions/navigation';

export default {
    showBottomSheetWithOptions: (options: any, callback: any) => {
        function itemAction(index: any) {
            callback(index);
        }

        let items = options.options;

        if (typeof options.cancelButtonIndex === 'number') {
            items = items.splice(0, options.cancelButtonIndex);
        }

        items = items.map((o: string | {icon: string; text: string}, index: any) => ({
            action: () => itemAction(index),
            text: typeof o === 'string' ? o : o.text,
            icon: typeof o === 'string' ? null : o.icon,
        }));

        showModalOverCurrentContext('OptionsModal', {
            title: options.title || '',
            items,
            subtitle: options.subtitle,
        });
    },
};
