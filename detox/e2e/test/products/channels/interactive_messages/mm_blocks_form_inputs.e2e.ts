// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import path from 'path';

import {MmBlocksTestHelper} from '@support/mm_blocks_test_helper';
import {Post, User} from '@support/server_api';
import {hasStableWebhookIngress, siteOneUrl} from '@support/test_config';
import {
    ChannelScreen,
    HomeScreen,
    InteractiveDialogScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {
    getRandomId,
    isAndroid,
    scrollElementIntoView,
    timeouts,
    wait,
} from '@support/utils';
import {expect, waitFor} from 'detox';

// Render-only coverage needs the Mattermost API only. Submit / onChange assertions depend on
// Mattermost being able to call back into the webhook sidecar.
const itNeedsStableIngress = hasStableWebhookIngress ? it : it.skip;

const FIXTURES_DIR = path.resolve(__dirname, '../../../../support/fixtures');

const field = {
    textInputLabel: (name: string) => element(by.id(InteractiveDialogScreen.textInputLabelTestID(name))),
    textInputRow: (name: string) => element(by.id(InteractiveDialogScreen.textInputEditButtonTestID(name))),
    boolInputLabel: (name: string) => element(by.id(InteractiveDialogScreen.boolInputLabelTestID(name))),
    boolInputToggle: (name: string, value: boolean) => element(by.id(InteractiveDialogScreen.boolInputTestID(name, value))),
    selectInputLabel: (name: string) => element(by.id(InteractiveDialogScreen.selectInputLabelTestID(name))),
    selectInputButton: (name: string) => element(by.id(InteractiveDialogScreen.selectButtonTestID(name))),
    selectInputRadio: (name: string, value: string) => element(by.id(InteractiveDialogScreen.radioOptionTestID(name, value))),
    dateInputLabel: (name: string) => element(by.id(InteractiveDialogScreen.dateInputLabelTestID(name))),
    dateInputButton: (name: string) => element(by.id(InteractiveDialogScreen.dateSelectButtonTestID(name))),
    datetimeInputLabel: (name: string) => element(by.id(InteractiveDialogScreen.dateTimeInputLabelTestID(name))),
    datetimeInputTimeButton: (name: string) => element(by.id(InteractiveDialogScreen.dateTimeTimeButtonTestID(name))),
    datetimeManualTimeInput: (name: string) => element(by.id(InteractiveDialogScreen.dateTimeManualTimeInputTestID(name))),
    fileInputLabel: (name: string) => element(by.id(InteractiveDialogScreen.fileInputLabelTestID(name))),
    fileInputChooseButton: (name: string) => element(by.id(InteractiveDialogScreen.fileChooseFileButtonTestID(name))),
};

describe('Interactive mm_blocks - Form inputs', () => {
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        // Callback specs need the sidecar; the render-only spec posts through the Mattermost API.
        if (hasStableWebhookIngress) {
            await MmBlocksTestHelper.requireWebhookSidecar();
        }
        const setup = await MmBlocksTestHelper.setupChannelTest();
        testChannel = setup.channel;
        testUser = setup.user;
    });

    beforeEach(() => {
        MmBlocksTestHelper.assertSuiteRunnable();
    });

    afterEach(async () => {
        try {
            await MmBlocksTestHelper.ensureOnChannelScreen();
        } catch {
            // Next test will re-assert / abort if the suite is blocked.
        }
    });

    afterAll(async () => {
        try {
            await MmBlocksTestHelper.ensureOnChannelScreen();
            await ChannelScreen.back();
        } catch {
            // Relaunch recovery may already be on the channel list (CI 30340678924).
        }
        await HomeScreen.logout();
    });

    /**
     * Resolve the form post by marker via API, then open its thread.
     * Field testIDs (e.g. text_input.*.edit.button) are reused across posts, so waiting on them
     * is ambiguous after earlier specs leave similar forms in the channel.
     */
    const openThreadForFormPost = async (marker: string) => {
        const {post, error} = await Post.apiFindPostInChannelByMessage(siteOneUrl, testChannel.id, marker);
        if (error || !post?.id) {
            throw new Error(`[mm_blocks] Failed to find form post for marker "${marker}"`);
        }
        await waitFor(element(MmBlocksTestHelper.channelPostMatcher(post.id))).
            toExist().
            withTimeout(timeouts.TWENTY_SEC);
        await MmBlocksTestHelper.openThreadForPost(post.id, marker);
    };

    /** Scope field matchers to the open thread so earlier specs' channel-list copies stay out of the match. */
    const inThread = (testID: string) =>
        element(by.id(testID).withAncestor(by.id(ThreadScreen.postList.testID.flatList)));

    /** Date/time pickers are tapped directly, so mirror the scroll handling the helpers do. */
    const tapInThread = async (testID: string) => {
        const target = inThread(testID);
        try {
            await scrollElementIntoView(target, by.id(ThreadScreen.postList.testID.flatList));
        } catch {
            // Already on screen, or the list cannot scroll further.
        }
        await waitFor(target).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await target.tap();
    };

    it('MM-T6241_1 - should render mm_blocks form inputs in a post', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks form inputs render');

        await MmBlocksTestHelper.postBlocksPost(testChannel.id, {
            marker,
            displayName: 'Detox mm_blocks form inputs render',
            blocks: [
                {
                    type: 'text_input',
                    name: 'title',
                    label: 'Title',
                    placeholder: 'Short summary',
                    initial_value: 'Sample ticket',
                    help_text: 'Title help',
                },
                {
                    type: 'text_input',
                    name: 'notes',
                    label: 'Notes',
                    optional: true,
                    multiline: true,
                    placeholder: 'Anything else?',
                },
                {
                    type: 'text_input',
                    name: 'locked_title',
                    label: 'Locked title',
                    disabled: true,
                    initial_value: 'read only',
                },
                {
                    type: 'bool_input',
                    name: 'notify_email',
                    label: 'Email notifications',
                    placeholder: 'Send me status updates by email',
                    initial_value: true,
                    help_text: 'Notify help',
                },
                {
                    type: 'select',
                    name: 'priority',
                    label: 'Priority',
                    placeholder: 'Choose priority',
                    initial_option: 'medium',
                    options: [
                        {text: 'Low', value: 'low'},
                        {text: 'Medium', value: 'medium'},
                        {text: 'High', value: 'high'},
                    ],
                },
                {
                    type: 'select',
                    name: 'severity',
                    label: 'Severity',
                    style: 'expanded',
                    initial_option: 'sev2',
                    options: [
                        {text: 'SEV-1', value: 'sev1'},
                        {text: 'SEV-2', value: 'sev2'},
                    ],
                },
                {
                    type: 'date_input',
                    name: 'due',
                    label: 'Due date',
                    placeholder: 'Pick a due date',
                    initial_value: '2025-01-10',
                    help_text: 'Due date help',
                },
                {
                    type: 'datetime_input',
                    name: 'meeting',
                    label: 'Meeting time',
                    placeholder: 'Pick meeting time',
                },
                {
                    type: 'file_input',
                    name: 'attachments',
                    label: 'Attachments',
                    placeholder: 'Upload evidence',
                    help_text: 'File help',
                },
                {
                    type: 'file_input',
                    name: 'locked_files',
                    label: 'Locked files',
                    disabled: true,
                },
            ],
        });

        // * Verify every field type renders with its label
        await waitFor(field.textInputLabel('title')).toExist().withTimeout(timeouts.TWENTY_SEC);
        await expect(field.textInputLabel('title')).toHaveText('Title');
        await expect(field.textInputLabel('notes')).toHaveText('Notes');
        await expect(field.boolInputLabel('notify_email')).toHaveText('Email notifications');
        await expect(field.selectInputLabel('priority')).toHaveText('Priority');
        await expect(field.selectInputLabel('severity')).toHaveText('Severity');
        await expect(field.dateInputLabel('due')).toHaveText('Due date');
        await expect(field.datetimeInputLabel('meeting')).toHaveText('Meeting time');
        await expect(field.fileInputLabel('attachments')).toHaveText('Attachments');

        // * Verify the in-post controls render (text_input is a row that pushes the edit screen)
        await expect(field.textInputRow('title')).toExist();
        await expect(field.boolInputToggle('notify_email', true)).toExist();
        await expect(field.selectInputButton('priority')).toExist();
        await expect(field.selectInputRadio('severity', 'sev2')).toExist();
        await expect(field.dateInputButton('due')).toExist();
        await expect(field.datetimeInputTimeButton('meeting')).toExist();
        await expect(field.fileInputChooseButton('attachments')).toExist();

        // * Verify help text renders next to its field
        await expect(element(by.text('Title help'))).toExist();
        await expect(element(by.text('File help'))).toExist();

        // * Verify disabled fields still render their controls
        await expect(field.textInputRow('locked_title')).toExist();
        await expect(field.fileInputChooseButton('locked_files')).toExist();
    });

    itNeedsStableIngress('MM-T6242_1 - should send text_input, bool_input and select values on form submit', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks classic form submit');
        const titleValue = `Detox title ${getRandomId()}`;

        const actionId = await MmBlocksTestHelper.postFormValuesEchoPost(testChannel.id, {
            marker,
            actionId: 'detox_form_values_classic',
            fields: [
                {
                    type: 'text_input',
                    name: 'title',
                    label: 'Title',
                    placeholder: 'Short summary',
                },
                {
                    type: 'bool_input',
                    name: 'notify_email',
                    label: 'Email notifications',
                    placeholder: 'Send me status updates by email',
                },
                {
                    type: 'select',
                    name: 'priority',
                    label: 'Priority',
                    placeholder: 'Choose priority',
                    options: [
                        {text: 'Low', value: 'low'},
                        {text: 'Medium', value: 'medium'},
                        {text: 'High', value: 'high'},
                    ],
                },
                {
                    type: 'select',
                    name: 'severity',
                    label: 'Severity',
                    style: 'expanded',
                    options: [
                        {text: 'SEV-1', value: 'sev1'},
                        {text: 'SEV-2', value: 'sev2'},
                    ],
                },
            ],
        });

        // # Open the thread so the integration ephemeral lands next to the form
        await openThreadForFormPost(marker);

        // # Fill every required field, then submit
        await MmBlocksTestHelper.setPostTextInput('title', titleValue);
        await MmBlocksTestHelper.toggleBoolInput('notify_email', false);
        await MmBlocksTestHelper.selectInputOption('priority', 'High');
        await MmBlocksTestHelper.selectRadioInputOption('severity', 'sev1');
        await MmBlocksTestHelper.tapMmBlocksButton(actionId);

        // * Verify the integration received every form value (sidecar sorts keys)
        await MmBlocksTestHelper.waitForFormValuesOkMessage(
            `notify_email=true&priority=high&severity=sev1&title=${titleValue}`,
        );
        await MmBlocksTestHelper.expectOnlyVisibleToYou();
        await ThreadScreen.back();
    });

    itNeedsStableIngress('MM-T6243_1 - should send form_values on text_input onChange saved from the edit screen', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks text_input onChange');
        const titleValue = `Detox onChange ${getRandomId()}`;
        const onChangeActionId = 'detox_text_input_onchange';

        await MmBlocksTestHelper.postBlocksPost(testChannel.id, {
            marker,
            displayName: 'Detox mm_blocks text_input onChange',
            blocks: [{
                type: 'text_input',
                name: 'title',
                label: 'Title',
                placeholder: 'Short summary',
                onChange: onChangeActionId,
            }],
            actions: {
                [onChangeActionId]: {
                    type: 'external',
                    url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_echo_form_values'),
                    context: {},
                },
            },
        });

        await MmBlocksTestHelper.waitForPostText(marker, timeouts.TWENTY_SEC);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await MmBlocksTestHelper.openThreadForPost(post.id, marker);

        // # In-post text_input opens a modal screen: type there and save (onChange fires on save)
        await MmBlocksTestHelper.setPostTextInput('title', titleValue);

        // * Verify the saved value reached the integration
        await MmBlocksTestHelper.waitForFormValuesOkMessage(`title=${titleValue}`);
        await MmBlocksTestHelper.expectOnlyVisibleToYou();
        await ThreadScreen.back();
    });

    itNeedsStableIngress('MM-T6244_1 - should send form_values on bool_input and select onChange', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks bool select onChange');
        const boolActionId = 'detox_bool_input_onchange';
        const selectActionId = 'detox_select_input_onchange';
        const echoUrl = MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_echo_form_values');

        await MmBlocksTestHelper.postBlocksPost(testChannel.id, {
            marker,
            displayName: 'Detox mm_blocks bool select onChange',
            blocks: [
                {
                    type: 'bool_input',
                    name: 'notify_email',
                    label: 'Email notifications',
                    placeholder: 'Send me status updates by email',
                    onChange: boolActionId,
                },
                {
                    type: 'select',
                    name: 'priority',
                    label: 'Priority',
                    placeholder: 'Choose priority',
                    onChange: selectActionId,
                    options: [
                        {text: 'Low', value: 'low'},
                        {text: 'Medium', value: 'medium'},
                        {text: 'High', value: 'high'},
                    ],
                },
            ],
            actions: {
                [boolActionId]: {type: 'external', url: echoUrl, context: {}},
                [selectActionId]: {type: 'external', url: echoUrl, context: {}},
            },
        });

        await MmBlocksTestHelper.waitForPostText(marker, timeouts.TWENTY_SEC);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await MmBlocksTestHelper.openThreadForPost(post.id, marker);

        // # Toggle the checkbox — onChange carries every field, so the untouched select is still empty
        await MmBlocksTestHelper.toggleBoolInput('notify_email', false);
        await MmBlocksTestHelper.waitForTextMatching(
            /Detox mm_blocks form_values OK \(notify_email=true&priority=\)/,
            timeouts.TWENTY_SEC,
        );

        // # Pick a select option
        await MmBlocksTestHelper.selectInputOption('priority', 'High');
        await MmBlocksTestHelper.waitForTextMatching(
            /Detox mm_blocks form_values OK \(notify_email=true&priority=high\)/,
            timeouts.TWENTY_SEC,
        );
        await MmBlocksTestHelper.expectOnlyVisibleToYou();
        await ThreadScreen.back();
    });

    itNeedsStableIngress('MM-T6245_1 - should load dynamic select options from lookup and submit the selected value', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks dynamic select');
        const lookupActionId = 'detox_dynamic_select_lookup';
        const actionId = 'detox_form_values_dynamic';

        // Built inline rather than with postFormValuesEchoPost: the dynamic select needs its own
        // lookup action alongside the submit action.
        await MmBlocksTestHelper.postBlocksPost(testChannel.id, {
            marker,
            displayName: 'Detox mm_blocks dynamic select',
            blocks: [
                {
                    type: 'select',
                    name: 'pick',
                    label: 'Dynamic option',
                    placeholder: 'Type to search',
                    data_source: 'dynamic',
                    data_source_action: lookupActionId,
                },
                {
                    type: 'button',
                    text: 'Submit pick',
                    style: 'primary',
                    subtype: 'submit',
                    action_id: actionId,
                },
            ],
            actions: {
                [lookupActionId]: {
                    type: 'external',
                    url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_lookup'),
                    context: {},
                },
                [actionId]: {
                    type: 'external',
                    url: MmBlocksTestHelper.integrationUrl('/mm_blocks_integration_echo_form_values'),
                    context: {},
                },
            },
        });

        await openThreadForFormPost(marker);

        // # Open the selector — options only exist if the lookup integration answered
        await MmBlocksTestHelper.selectInputOption('pick', 'Alpha');
        await MmBlocksTestHelper.tapMmBlocksButton(actionId);

        // * Verify the looked-up option value was submitted
        await MmBlocksTestHelper.waitForFormValuesOkMessage('pick=opt_alpha');
        await MmBlocksTestHelper.expectOnlyVisibleToYou();
        await ThreadScreen.back();
    });

    // The OS document picker that `Choose File` opens cannot be driven by Detox, so the upload
    // itself runs through the API and the field hydrates from `initial_value`. That still covers
    // the file_input path: hydrate server file IDs, then submit them as form values.
    itNeedsStableIngress('MM-T6246_1 - should submit uploaded file ids from file_input', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks file_input submit');

        // # Upload as the logged-in app user so FileInfo.CreatorId passes server ownership
        // checks on submit. apiCreateUser keeps the password on `.newUser` only.
        const {error: loginError} = await User.apiLogin(siteOneUrl, testUser.newUser);
        if (loginError) {
            throw new Error(`[mm_blocks] Failed to login as test user for file upload: ${JSON.stringify(loginError)}`);
        }
        const {fileId, error} = await Post.apiUploadFileToChannel(
            siteOneUrl,
            testChannel.id,
            path.join(FIXTURES_DIR, 'sample.txt'),
        );
        if (error || !fileId) {
            throw new Error(`[mm_blocks] Failed to upload file_input fixture: ${JSON.stringify(error)}`);
        }

        const actionId = await MmBlocksTestHelper.postFormValuesEchoPost(testChannel.id, {
            marker,
            actionId: 'detox_form_values_file',
            submitLabel: 'Submit files',
            fields: [{
                type: 'file_input',
                name: 'attachments',
                label: 'Attachments',
                placeholder: 'Upload evidence',
                initial_value: [fileId],
            }],
        });

        await openThreadForFormPost(marker);

        // * Verify the picker entry point is enabled for an editable field
        await expect(inThread(InteractiveDialogScreen.fileChooseFileButtonTestID('attachments'))).toExist();

        // # Submit the hydrated file id
        await MmBlocksTestHelper.tapMmBlocksButton(actionId);

        // * Verify the integration received the server file id
        await MmBlocksTestHelper.waitForFormValuesOkMessage(`attachments=${fileId}`);
        await MmBlocksTestHelper.expectOnlyVisibleToYou();
        await ThreadScreen.back();
    });

    // Last in the file: manual time entry leaves keyboard/animation state on iOS 26 that can
    // break later specs (same ordering constraint as MM-T2530H).
    itNeedsStableIngress('MM-T6247_1 - should submit date_input and datetime_input values', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E mm_blocks date datetime submit');
        const dueDate = '2027-03-15';

        // Both fields are optional so client-side validation never masks a picker problem —
        // the assertion below still requires the intended date/datetime values.
        const actionId = await MmBlocksTestHelper.postFormValuesEchoPost(testChannel.id, {
            marker,
            actionId: 'detox_form_values_dates',
            submitLabel: 'Submit dates',
            fields: [
                {
                    type: 'date_input',
                    name: 'due',
                    label: 'Due date',
                    placeholder: 'Pick a due date',
                    optional: true,
                },
                {
                    type: 'datetime_input',
                    name: 'meeting',
                    label: 'Meeting time',
                    optional: true,
                    datetime_config: {manual_time_entry: true},
                },
            ],
        });

        await openThreadForFormPost(marker);

        // # Pick a due date on the native picker (do not swallow setDatePickerDate failures)
        await tapInThread(InteractiveDialogScreen.dateSelectButtonTestID('due'));
        await wait(timeouts.ONE_SEC);
        await waitFor(InteractiveDialogScreen.nativeDateTimePicker).toExist().withTimeout(timeouts.TEN_SEC);
        await InteractiveDialogScreen.nativeDateTimePicker.setDatePickerDate(`${dueDate}T12:00:00Z`, 'ISO8601');
        await wait(timeouts.HALF_SEC);

        // # Dismiss the picker — iOS keeps it mounted after onChange, and a second open picker
        // would make the shared picker testID ambiguous.
        if (isAndroid()) {
            await element(by.text('OK')).tap();
        } else {
            await tapInThread(InteractiveDialogScreen.dateSelectButtonTestID('due'));
        }
        await wait(timeouts.ONE_SEC);

        // # Enter the meeting time manually (reliable alternative to the native time spinner)
        await tapInThread(InteractiveDialogScreen.dateTimeTimeButtonTestID('meeting'));
        const manualTime = inThread(InteractiveDialogScreen.dateTimeManualTimeInputTestID('meeting'));
        await waitFor(manualTime).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await manualTime.replaceText('14:30');
        await manualTime.tapReturnKey();
        await wait(timeouts.ONE_SEC);

        // # Submit both values
        await MmBlocksTestHelper.tapMmBlocksButton(actionId);

        // * Verify the intended ISO date and an ISO datetime reached the integration
        await MmBlocksTestHelper.waitForTextMatching(
            MmBlocksTestHelper.textContaining(`due=${dueDate}&meeting=`),
            timeouts.TWENTY_SEC,
        );
        await MmBlocksTestHelper.waitForTextMatching(
            /.*meeting=\d{4}-\d{2}-\d{2}T.*/,
            timeouts.TWENTY_SEC,
        );
        await MmBlocksTestHelper.expectOnlyVisibleToYou();
        await ThreadScreen.back();
    });
});
