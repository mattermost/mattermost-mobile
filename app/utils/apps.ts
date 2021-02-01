// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {AppBinding} from '@mm-redux/types/apps';
import {GlobalState} from '@mm-redux/types/store';

export function appsEnabled(state: GlobalState) { // eslint-disable-line @typescript-eslint/no-unused-vars
    // TODO: Add feature branch and/or proxy state check
    return true;
}

export function fillBindingsInformation(binding: AppBinding) {
    binding.bindings?.forEach((b) => {
        b.app_id = binding.app_id;
        b.location = binding.location + '/' + b.location;
        if (!b.call) {
            b.call = binding.call;
        }
        fillBindingsInformation(b);
    });
}
