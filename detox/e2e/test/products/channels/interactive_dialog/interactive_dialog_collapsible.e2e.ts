// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    cleanUpAfterDialogTest,
    ensureDialogClosed,
    ensureDialogOpen,
    logOutAfterDialogSuite,
    postSlashCommandDirect,
    setUpDialogSuite,
} from '@support/interactive_dialog_plugin_helper';
import {Post} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';
import {InteractiveDialogScreen} from '@support/ui/screen';
import {wait, timeouts} from '@support/utils';

// Runs on the pool servers: every full-suite server has the demo plugin, in DialogOnlyMode, and this spec
// changes no server-wide state.
describe('Interactive Dialog - Collapsible Sections (Plugin)', () => {
    const channelsCategory = 'channels';
    let testChannel: any;
    let setupFailed = false;

    beforeAll(async () => {
        try {
            ({channel: testChannel} = await setUpDialogSuite(channelsCategory));
        } catch (error) {
            setupFailed = true;
            throw error;
        }
    });

    afterAll(async () => {
        await logOutAfterDialogSuite();
    });

    afterEach(async () => {
        if (setupFailed) {
            return;
        }
        await cleanUpAfterDialogTest(channelsCategory, testChannel);
    });

    // Driven by the demo plugin's `/dialog collapsible` sample, which nests fields 1, 2,
    // and 3 levels deep. Level 1 starts expanded; levels 2 and 3 start collapsed. A field
    // inside a collapsed section is unmounted, so its input's existence proxies open state.
    // NOTE: MM-T<collapsible>-N are placeholders. Per QA (Zephyr Scale in JIRA), real IDs
    // may be dropped as a step; swap these if/when QA assigns them.
    it('MM-T<collapsible>-1 should show expanded section fields and hide collapsed ones (Plugin)', async () => {
        await ensureDialogClosed();
        await postSlashCommandDirect('/dialog collapsible');
        await ensureDialogOpen();

        // * Level 1 starts expanded, so its fields are present
        await InteractiveDialogScreen.expectFieldVisible('first_name', true);
        await InteractiveDialogScreen.expectFieldVisible('last_name', true);

        // * Levels 2 and 3 start collapsed, so their fields are not mounted
        await InteractiveDialogScreen.expectFieldVisible('company', false);
        await InteractiveDialogScreen.expectFieldVisible('project_name', false);

        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T<collapsible>-2 should reveal nested fields when expanding sections (Plugin)', async () => {
        await ensureDialogClosed();
        await postSlashCommandDirect('/dialog collapsible');
        await ensureDialogOpen();

        // # Expand level 2; its inner section is expanded by default
        await InteractiveDialogScreen.toggleSection('level2_section');

        // * Level 2 field and its already-expanded inner-section fields appear
        await InteractiveDialogScreen.expectFieldVisible('company', true);
        await InteractiveDialogScreen.expectFieldVisible('email', true);
        await InteractiveDialogScreen.expectFieldVisible('phone', true);

        // # Expand level 3; its inner section stays collapsed until tapped
        await InteractiveDialogScreen.toggleSection('level3_section');
        await InteractiveDialogScreen.expectFieldVisible('project_name', true);
        await InteractiveDialogScreen.expectFieldVisible('environment', false);

        // # Expand the innermost section to reveal its field
        await InteractiveDialogScreen.toggleSection('level3_inner_section');
        await InteractiveDialogScreen.expectFieldVisible('environment', true);

        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T<collapsible>-3 should fill fields across sections and submit (Plugin)', async () => {
        await ensureDialogClosed();
        await postSlashCommandDirect('/dialog collapsible');
        await ensureDialogOpen();

        // # Fill the required level-1 fields, then expand level 2 for its required email.
        // first_name, last_name, and email are all required; the submit is blocked until
        // every one is filled, so a missing field yields no post at all.
        await InteractiveDialogScreen.fillTextElement('first_name', 'Ada');
        await InteractiveDialogScreen.fillTextElement('last_name', 'Lovelace');
        await InteractiveDialogScreen.toggleSection('level2_section');

        // Let the section finish expanding before typing; on iOS, filling while it still
        // animates drops the input and the submit silently no-ops.
        await wait(timeouts.ONE_SEC);
        await InteractiveDialogScreen.fillTextElement('email', 'ada@example.com');

        // # Submit and verify via the server post (a post only appears once every required
        // field is accepted), not the rendered UI, which flakes on the just-created post.
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        if (!post?.message?.includes('Dialog Submitted:')) {
            throw new Error(`Expected a "Dialog Submitted:" post, got: ${post?.message}`);
        }
    });

    it('MM-T<collapsible>-4 should auto-expand a collapsed section when its field errors, then submit (Plugin)', async () => {
        await ensureDialogClosed();
        await postSlashCommandDirect('/dialog collapsible');
        await ensureDialogOpen();

        // # Fill the level-1 required fields but leave level 2 collapsed, so its required
        // `email` stays empty and unmounted.
        await InteractiveDialogScreen.fillTextElement('first_name', 'Ada');
        await InteractiveDialogScreen.fillTextElement('last_name', 'Lovelace');

        // * email isn't mounted while its section is collapsed
        await InteractiveDialogScreen.expectFieldVisible('email', false);

        // # Submit with the required email still empty
        await InteractiveDialogScreen.submit();

        // * Client-side validation fails and auto-expands level 2, mounting the errored
        // email field without ever tapping its toggle. The dialog stays open (no post).
        await InteractiveDialogScreen.expectFieldVisible('email', true);

        // # Fill the now-revealed email and resubmit. Let the section settle first, as in -3.
        await wait(timeouts.ONE_SEC);
        await InteractiveDialogScreen.fillTextElement('email', 'ada@example.com');
        await InteractiveDialogScreen.submit();

        // * A post only appears once every required field is accepted.
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        if (!post?.message?.includes('Dialog Submitted:')) {
            throw new Error(`Expected a "Dialog Submitted:" post, got: ${post?.message}`);
        }
    });
});
