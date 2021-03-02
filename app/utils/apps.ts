// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {AppBinding} from '@mm-redux/types/apps';
import {GlobalState} from '@mm-redux/types/store';

export function appsEnabled(state: GlobalState) { // eslint-disable-line @typescript-eslint/no-unused-vars
    // TODO: Add feature branch and/or proxy state check
    return true;
}

export function copyAndFillBindings(binding?: AppBinding): AppBinding | undefined {
    if (!binding) {
        return undefined;
    }

    const copy = JSON.parse(JSON.stringify(binding));
    fillBindingsInformation(copy);
    return copy;
}

export function fillBindingsInformation(binding?: AppBinding) {
    if (!binding) {
        return;
    }

    binding.bindings?.forEach((b) => {
        // Propagate id down if not defined
        if (!b.app_id) {
            b.app_id = binding.app_id;
        }

        // Compose location
        b.location = binding.location + '/' + b.location;

        // Propagate call down if not defined
        if (!b.call) {
            b.call = binding.call;
        }

        fillBindingsInformation(b);
    });

    // Trim branches without app_id
    if (!binding.app_id) {
        binding.bindings = binding.bindings?.filter((v) => v.app_id);
    }

    // Trim branches without calls
    if (!binding.call) {
        binding.bindings = binding.bindings?.filter((v) => v.call);
    }

    // Pull up app_id if needed
    if (binding.bindings?.length && !binding.app_id) {
        binding.app_id = binding.bindings[0].app_id;
    }

    // Pull up call if needed
    if (binding.bindings?.length && !binding.call) {
        binding.call = binding.bindings[0].call;
    }
}
