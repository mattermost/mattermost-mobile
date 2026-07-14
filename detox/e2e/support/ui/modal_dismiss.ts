// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts, wait} from '@support/utils';
import {by, element, waitFor} from 'detox';

export const KNOWN_MODAL_CLOSE_BUTTON_IDS: readonly string[] = Object.freeze([
    'close.create_or_edit_channel.button',
    'close.channel_info.button',
    'close.channel_add_members.button',
    'close.channel_bookmark.button',
    'close.channel_files.button',
    'close.channel_configuration.button',
    'close.create_direct_message.button',
    'close.find_channels.button',
    'close.browse_channels.button',
    'close.edit_post.button',
    'close.edit_profile.button',
    'close.edit_server.button',
    'close.invite.button',
    'close.join_team.button',
    'close.reschedule_draft.button',
    'close.settings.button',
    'close.custom_status.button',
    'close.apps_form.button',
    'close.interactive_dialog.button',
    'navigation.header.search_bar.search.cancel.button', // dismiss leftover search screen in beforeEach recovery
    'close.login.button', // entry/auth screen leftovers
    'close.server.button',
    'close.sso.button',
    'tutorial_highlight',
] as const);

/**
 * Best-effort dismiss of a modal blocking the channel/post draft.
 * Repeats up to maxDepth times when nested modals are stacked.
 */
export async function dismissKnownModals(maxDepth = 1): Promise<void> {
    /* eslint-disable no-await-in-loop -- sequential modal dismissals */
    for (let depth = 0; depth < maxDepth; depth++) {
        let dismissedOne = false;
        for (const closeId of KNOWN_MODAL_CLOSE_BUTTON_IDS) {
            const btn = element(by.id(closeId));
            try {
                await waitFor(btn).toExist().withTimeout(timeouts.HALF_SEC);
                await btn.tap();
                await wait(timeouts.ONE_SEC);
                dismissedOne = true;
                break;
            } catch {
                // Not this modal.
            }
        }
        if (!dismissedOne) {
            return;
        }
    }
    /* eslint-enable no-await-in-loop */
}
