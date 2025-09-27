// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable camelcase, no-console */

const axios = require('axios');
const ClientOAuth2 = require('client-oauth2');
const express = require('express');

const postMessageAs = require('./utils/post_message_as');
const webhookUtils = require('./utils/webhook_utils');
const port = 3000;

const {
    SITE_URL,
    WEBHOOK_BASE_URL,
    ADMIN_USERNAME,
    ADMIN_PASSWORD,
} = process.env; // eslint-disable-line no-process-env

const server = express();
server.use(express.json());
server.use(express.urlencoded({extended: true}));

// Log all incoming requests
server.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    if (req.query && Object.keys(req.query).length > 0) {
        console.log('Query params:', req.query);
    }
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Request body:', req.body);
    }
    next();
});

// Add error handling for failed requests
server.use((err, req, res, next) => {
    console.error('=== SERVER ERROR ===');
    console.error('Error:', err);
    console.error('Request URL:', req.url);
    console.error('Request Method:', req.method);
    console.error('=== END SERVER ERROR ===');
    next(err);
});

process.title = process.argv[2];

server.get('/', ping);
server.post('/message_menus', postMessageMenus);
server.post('/dialog_request', onDialogRequest);
server.post('/simple_dialog_request', onSimpleDialogRequest);
server.post('/user_and_channel_dialog_request', onUserAndChannelDialogRequest);
server.post('/text_fields_dialog_request', onTextFieldsDialogRequest);
server.post('/dialog_submit', onDialogSubmit);
server.post('/dialog_submit_error', onDialogSubmitError);
server.post('/boolean_dialog_request', onBooleanDialogRequest);
server.post('/simple_dialog_error_request', onSimpleDialogErrorRequest);
server.post('/select_fields_dialog_request', onSelectFieldsDialogRequest);
server.post('/multiselect_dynamic_dialog_request', onMultiselectDynamicDialogRequest);
server.post('/dynamic_options', getDynamicOptions);
server.post('/dynamic_multiselect_options', getDynamicMultiselectOptions);
server.post('/slack_compatible_message_response', postSlackCompatibleMessageResponse);
server.post('/send_message_to_channel', postSendMessageToChannel);
server.post('/post_outgoing_webhook', postOutgoingWebhook);
server.post('/send_oauth_credentials', postSendOauthCredentials);
server.get('/start_oauth', getStartOAuth);
server.get('/complete_oauth', getCompleteOauth);
server.post('/postOAuthMessage', postOAuthMessage);

function ping(req, res) {
    const baseUrl = SITE_URL || 'http://localhost:8065';
    const webhookBaseUrl = WEBHOOK_BASE_URL || 'http://localhost:3000';

    return res.json({
        message: 'I\'m alive!',
        baseUrl,
        webhookBaseUrl,
    });
}

server.listen(port, () => console.log(`Webhook test server listening on port ${port}!`));

let appID;
let appSecret;
let client;
let authedUser;
function postSendOauthCredentials(req, res) {
    appID = req.body.appID.trim();
    appSecret = req.body.appSecret.trim();
    client = new ClientOAuth2({
        clientId: appID,
        clientSecret: appSecret,
        authorizationUri: getBaseUrl() + '/oauth/authorize',
        accessTokenUri: getBaseUrl() + '/oauth/access_token',
        redirectUri: getWebhookBaseUrl() + '/complete_oauth',
    });
    return res.status(200).send('OK');
}

function getStartOAuth(req, res) {
    return res.redirect(client.code.getUri());
}

function getCompleteOauth(req, res) {
    client.code.getToken(req.originalUrl).then((user) => {
        authedUser = user;
        return res.status(200).send('OK');
    }).catch((reason) => {
        return res.status(reason.status).send(reason);
    });
}

async function postOAuthMessage(req, res) {
    const {channelId, message, rootId, createAt} = req.body;
    const apiUrl = getBaseUrl() + '/api/v4/posts';
    authedUser.sign({
        method: 'post',
        url: apiUrl,
    });
    try {
        await axios({
            url: apiUrl,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                Authorization: 'Bearer ' + authedUser.accessToken,
            },
            method: 'post',
            data: {
                channel_id: channelId,
                message,
                type: '',
                create_at: createAt,
                root_id: rootId,
            },
        });
    } catch (err) {
        // Do nothing
    }
    return res.status(200).send('OK');
}

function postSlackCompatibleMessageResponse(req, res) {
    const {spoiler, skipSlackParsing} = req.body.context;

    res.setHeader('Content-Type', 'application/json');
    return res.json({
        ephemeral_text: spoiler,
        skip_slack_parsing: skipSlackParsing,
    });
}

function postMessageMenus(req, res) {
    let responseData = {};
    const {body} = req;
    if (body && body.context.action === 'do_something') {
        responseData = {
            ephemeral_text: `Ephemeral | ${body.type} ${body.data_source} option: ${body.context.selected_option}`,
        };
    }

    res.setHeader('Content-Type', 'application/json');
    return res.json(responseData);
}

async function openDialog(dialog) {
    const baseUrl = getBaseUrl();
    await axios({
        method: 'post',
        url: `${baseUrl}/api/v4/actions/dialogs/open`,
        data: dialog,
    });
}

function onDialogRequest(req, res) {
    const {body} = req;
    if (body.trigger_id) {
        const webhookBaseUrl = getWebhookBaseUrl();
        const dialog = webhookUtils.getFullDialog(body.trigger_id, webhookBaseUrl);
        openDialog(dialog);
    }

    res.setHeader('Content-Type', 'application/json');
    return res.json({text: 'Full dialog triggered via slash command!'});
}

function onSimpleDialogRequest(req, res) {
    const {body} = req;
    if (body.trigger_id) {
        const webhookBaseUrl = getWebhookBaseUrl();
        const dialog = webhookUtils.getSimpleDialog(body.trigger_id, webhookBaseUrl);
        openDialog(dialog);
    }

    res.setHeader('Content-Type', 'application/json');
    return res.json({text: 'Simple dialog triggered via slash command!'});
}

function onUserAndChannelDialogRequest(req, res) {
    const {body} = req;
    if (body.trigger_id) {
        const webhookBaseUrl = getWebhookBaseUrl();
        const dialog = webhookUtils.getUserAndChannelDialog(body.trigger_id, webhookBaseUrl);
        openDialog(dialog);
    }

    res.setHeader('Content-Type', 'application/json');
    return res.json({text: 'Simple dialog triggered via slash command!'});
}

function onTextFieldsDialogRequest(req, res) {
    const {body} = req;
    if (body.trigger_id) {
        const webhookBaseUrl = getWebhookBaseUrl();
        const dialog = webhookUtils.getTextFieldsDialog(body.trigger_id, webhookBaseUrl);
        openDialog(dialog);
    }

    res.setHeader('Content-Type', 'application/json');
    return res.json({text: 'Text fields dialog triggered via slash command!'});
}

function onBooleanDialogRequest(req, res) {
    const {body} = req;
    if (body.trigger_id) {
        const webhookBaseUrl = getWebhookBaseUrl();
        const dialog = webhookUtils.getBooleanDialog(body.trigger_id, webhookBaseUrl);
        openDialog(dialog);
    }

    res.setHeader('Content-Type', 'application/json');
    return res.json({text: 'Simple dialog triggered via slash command!'});
}

function onSimpleDialogErrorRequest(req, res) {
    const {body} = req;
    if (body.trigger_id) {
        const webhookBaseUrl = getWebhookBaseUrl();

        // Create a simple dialog that will submit to the error endpoint
        const dialog = {
            trigger_id: body.trigger_id,
            url: `${webhookBaseUrl}/dialog_submit_error`,
            dialog: {
                callback_id: 'simpleerrorcallbackid',
                title: 'Simple Dialog Error Test',
                icon_url: 'http://www.mattermost.org/wp-content/uploads/2016/04/icon.png',
                submit_label: 'Submit Test',
                notify_on_cancel: true,
                state: 'somestate',
                elements: [
                    {
                        display_name: 'Optional Text Field',
                        name: 'optional_text',
                        type: 'text',
                        default: '',
                        placeholder: 'Enter some text (will trigger error)...',
                        help_text: 'This field will trigger a server error for testing',
                        optional: true,
                        min_length: 0,
                        max_length: 100,
                    },
                ],
            },
        };
        openDialog(dialog);
    }

    res.setHeader('Content-Type', 'application/json');
    return res.json({text: 'Error dialog triggered via slash command!'});
}

function onSelectFieldsDialogRequest(req, res) {
    const {body} = req;
    if (body.trigger_id) {
        const webhookBaseUrl = getWebhookBaseUrl();

        // Create a focused dialog with select field types for testing
        const dialog = {
            trigger_id: body.trigger_id,
            url: `${webhookBaseUrl}/dialog_submit`,
            dialog: {
                callback_id: 'selectfieldscallbackid',
                title: 'Select Fields Dialog Test',
                icon_url: 'http://www.mattermost.org/wp-content/uploads/2016/04/icon.png',
                submit_label: 'Submit Test',
                notify_on_cancel: true,
                state: 'somestate',
                elements: [
                    {
                        display_name: 'Radio Option Selector',
                        name: 'someradiooptions',
                        type: 'radio',
                        help_text: 'Choose your department',
                        optional: false,
                        options: [
                            {
                                text: 'Engineering',
                                value: 'engineering',
                            },
                            {
                                text: 'Sales',
                                value: 'sales',
                            },
                            {
                                text: 'Marketing',
                                value: 'marketing',
                            },
                        ],
                    },
                    {
                        display_name: 'Option Selector',
                        name: 'someoptionselector',
                        type: 'select',
                        subtype: '',
                        default: '',
                        placeholder: 'Select an option...',
                        help_text: 'Choose from static options',
                        optional: false,
                        min_length: 0,
                        max_length: 0,
                        data_source: '',
                        options: [
                            {
                                text: 'Option1',
                                value: 'opt1',
                            },
                            {
                                text: 'Option2',
                                value: 'opt2',
                            },
                            {
                                text: 'Option3',
                                value: 'opt3',
                            },
                        ],
                    },
                    {
                        display_name: 'User Selector',
                        name: 'someuserselector',
                        type: 'select',
                        subtype: '',
                        default: '',
                        placeholder: 'Select a user...',
                        help_text: 'Choose a user from the team',
                        optional: false,
                        min_length: 0,
                        max_length: 0,
                        data_source: 'users',
                        options: null,
                    },
                    {
                        display_name: 'Channel Selector',
                        name: 'somechannelselector',
                        type: 'select',
                        subtype: '',
                        default: '',
                        placeholder: 'Select a channel...',
                        help_text: 'Choose a channel from the list',
                        optional: true,
                        min_length: 0,
                        max_length: 0,
                        data_source: 'channels',
                        options: null,
                    },
                ],
            },
        };
        openDialog(dialog);
    }

    res.setHeader('Content-Type', 'application/json');
    return res.json({text: 'Select fields dialog triggered via slash command!'});
}

function onDialogSubmitError(req, res) {
    const {body} = req;

    console.log('💥 Dialog error endpoint called:', body);

    // Return error response that should keep dialog open and show error
    res.status(400).json({
        error: 'Server error: Unable to process dialog submission',
        errors: {
            'optional_text': 'This is a simulated server error for testing',
        },
    });
}

function onDialogSubmit(req, res) {
    const {body} = req;

    res.setHeader('Content-Type', 'application/json');

    let message;
    if (body.cancelled) {
        message = 'Dialog cancelled';
        sendSysadminResponse(message, body.channel_id);
    } else {
        const submission = body.submission || {};

        // Debug logging for dialog submissions (can be removed in production)
        console.log('📋 Dialog submission received:', {
            callback_id: body.callback_id,
            submission,
        });

        // For boolean dialog, post detailed submission values to channel
        if (body.callback_id === 'booleancallbackid') {
            const booleanValues = {
                required_boolean: submission.required_boolean,
                optional_boolean: submission.optional_boolean,
                boolean_default_true: submission.boolean_default_true,
                boolean_default_false: submission.boolean_default_false,
            };

            console.log('📝 Boolean dialog submission:', booleanValues);

            // Post structured submission results to channel for e2e verification
            message = `Boolean Dialog Submitted:
- required_boolean: ${booleanValues.required_boolean}
- optional_boolean: ${booleanValues.optional_boolean}  
- boolean_default_true: ${booleanValues.boolean_default_true}
- boolean_default_false: ${booleanValues.boolean_default_false}`;
        } else if (body.callback_id === 'textfieldscallbackid') {
            const textValues = {
                text_field: submission.text_field,
                required_text: submission.required_text,
                email_field: submission.email_field,
                number_field: submission.number_field,
                password_field: submission.password_field,
                textarea_field: submission.textarea_field,
            };

            console.log('📝 Text fields dialog submission:', textValues);

            // Post structured submission results to channel for e2e verification
            message = `Text Fields Dialog Submitted:
- text_field: ${textValues.text_field}
- required_text: ${textValues.required_text}
- email_field: ${textValues.email_field}
- number_field: ${textValues.number_field}
- password_field: ${textValues.password_field}
- textarea_field: ${textValues.textarea_field}`;
        } else if (body.callback_id === 'selectfieldscallbackid') {
            const selectValues = {
                someradiooptions: submission.someradiooptions,
                someoptionselector: submission.someoptionselector,
                someuserselector: submission.someuserselector,
                somechannelselector: submission.somechannelselector,
            };

            console.log('📝 Select fields dialog submission:', selectValues);

            // Post structured submission results to channel for e2e verification
            message = `Select Fields Dialog Submitted:
- someradiooptions: ${selectValues.someradiooptions}
- someoptionselector: ${selectValues.someoptionselector}
- someuserselector: ${selectValues.someuserselector}
- somechannelselector: ${selectValues.somechannelselector}`;
        } else {
            message = `Dialog submitted with values: ${JSON.stringify(submission)}`;
        }

        sendSysadminResponse(message, body.channel_id);
    }

    return res.json({text: message});
}

/**
 * @route "POST /send_message_to_channel?type={messageType}&channel_id={channelId}"
 * @query type - message type of empty string for regular message if not provided (default), "system_message", etc
 * @query channel_id - channel where to send the message
 */
function postSendMessageToChannel(req, res) {
    const channelId = req.query.channel_id;
    const response = {
        response_type: 'in_channel',
        text: 'Extra response 2',
        channel_id: channelId,
        extra_responses: [{
            response_type: 'in_channel',
            text: 'Hello World',
            channel_id: channelId,
        }],
    };

    if (req.query.type) {
        response.type = req.query.type;
    }

    res.json(response);
}

function getWebhookBaseUrl() {
    return WEBHOOK_BASE_URL || 'http://localhost:3000';
}

function getBaseUrl() {
    return SITE_URL || 'http://localhost:8065';
}

// Convenient way to send response in a channel by using sysadmin account
function sendSysadminResponse(message, channelId) {
    const username = ADMIN_USERNAME || 'sysadmin';
    const password = ADMIN_PASSWORD || 'Sys@dmin-sample1';
    const baseUrl = getBaseUrl();
    postMessageAs(baseUrl, {sender: {username, password}, message, channelId});
}

const responseTypes = ['in_channel', 'comment'];

function getWebhookResponse(body, {responseType, username, iconUrl}) {
    const payload = Object.entries(body).map(([key, value]) => `- ${key}: "${value}"`).join('\n');

    return `
\`\`\`
#### Outgoing Webhook Payload
${payload}
#### Webhook override to Mattermost instance
- response_type: "${responseType}"
- type: ""
- username: "${username}"
- icon_url: "${iconUrl}"
\`\`\`
`;
}

/**
 * @route "POST /post_outgoing_webhook?override_username={username}&override_icon_url={iconUrl}&response_type={comment}"
 * @query override_username - the user name that overrides the user name defined by the outgoing webhook
 * @query override_icon_url - the user icon url that overrides the user icon url defined by the outgoing webhook
 * @query response_type - "in_channel" (default) or "comment"
 */
function postOutgoingWebhook(req, res) {
    const {body, query} = req;
    if (!body) {
        res.status(404).send({error: 'Invalid data'});
    }

    const responseType = query.response_type || responseTypes[0];
    const username = query.override_username || '';
    const iconUrl = query.override_icon_url || '';

    const response = {
        text: getWebhookResponse(body, {responseType, username, iconUrl}),
        username,
        icon_url: iconUrl,
        type: '',
        response_type: responseType,
    };
    res.status(200).send(response);
}

function onMultiselectDynamicDialogRequest(req, res) {
    const {body} = req;
    console.log('=== MULTISELECT DYNAMIC DIALOG REQUEST ===');
    console.log('Request body:', JSON.stringify(body, null, 2));

    if (body.trigger_id) {
        const webhookBaseUrl = getWebhookBaseUrl();
        console.log('Webhook base URL:', webhookBaseUrl);

        const dialog = webhookUtils.getMultiselectDynamicDialog(body.trigger_id, webhookBaseUrl);
        console.log('Generated dialog:', JSON.stringify(dialog, null, 2));

        openDialog(dialog);
        console.log('Dialog sent to openDialog function');
    }

    res.setHeader('Content-Type', 'application/json');
    console.log('=== END MULTISELECT DYNAMIC DIALOG REQUEST ===');
    return res.json({text: 'Multiselect dynamic dialog triggered via slash command!'});
}

function getDynamicOptions(req, res) {
    const {body} = req;
    const searchTerm = body.user_input || '';

    // Add a small delay to simulate real API call
    setTimeout(() => {
        const response = webhookUtils.getDynamicOptionsResponse(searchTerm);
        res.status(200).json(response);
    }, 200);
}

function getDynamicMultiselectOptions(req, res) {
    const {body} = req;
    const searchTerm = body.user_input || '';

    // Add a small delay to simulate real API call
    setTimeout(() => {
        const response = webhookUtils.getDynamicMultiselectOptionsResponse(searchTerm);
        res.status(200).json(response);
    }, 300);
}

// Catch-all route for unmatched requests
server.use((req, res) => {

    res.status(404).json({
        error: 'Not Found',
        method: req.method,
        url: req.originalUrl,
        message: 'This endpoint does not exist on the webhook server',
    });
});

server.listen(port, () => {
    console.log(`Webhook test server listening on port ${port}!`);
});
