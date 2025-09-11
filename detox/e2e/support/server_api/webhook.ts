// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from './client';
import {getResponseFromError} from './common';
import {apiAdminLogin} from './user';

// Generate a simple trigger_id for testing (bypassing complex validation)
const generateTriggerId = (userId: string, channelId: string) => {
    // Create a trigger_id that matches the expected format
    // Based on server-side logic, trigger_ids are typically base64 encoded JSON
    const now = Date.now();
    const triggerData = `${userId}:${channelId}:${now}`;
    return Buffer.from(triggerData).toString('base64');
};

// Dialog definitions matching the server-side webhook_utils.js patterns
export const getSimpleDialog = (userId: string, channelId: string, webhookBaseUrl: string) => {
    return {
        trigger_id: generateTriggerId(userId, channelId),
        url: `${webhookBaseUrl}/dialog_submit`,
        dialog: {
            callback_id: 'simple_dialog_callback',
            title: 'Simple Dialog Test',
            introduction_text: 'This is a simple dialog for mobile e2e testing',
            elements: [
                {
                    display_name: 'Test Input',
                    name: 'test_text',
                    type: 'text',
                    default: '',
                    placeholder: 'Enter test text',
                    help_text: 'This is a test text input',
                    optional: false,
                    min_length: 0,
                    max_length: 100,
                },
            ],
        },
    };
};

export const getSelectDialog = (userId: string, channelId: string, webhookBaseUrl: string) => {
    return {
        trigger_id: generateTriggerId(userId, channelId),
        url: `${webhookBaseUrl}/dialog_submit`,
        dialog: {
            callback_id: 'select_dialog_callback',
            title: 'Select Dialog Test',
            introduction_text: 'This is a select dialog for mobile e2e testing',
            elements: [
                {
                    display_name: 'Test Select',
                    name: 'test_select',
                    type: 'select',
                    default: '',
                    placeholder: 'Choose an option',
                    help_text: 'This is a test select input',
                    optional: false,
                    options: [
                        {text: 'Option 1', value: 'option1'},
                        {text: 'Option 2', value: 'option2'},
                        {text: 'Option 3', value: 'option3'},
                    ],
                },
            ],
        },
    };
};

export const getMultiselectDialog = (userId: string, channelId: string, webhookBaseUrl: string) => {
    return {
        trigger_id: generateTriggerId(userId, channelId),
        url: `${webhookBaseUrl}/dialog_submit`,
        dialog: {
            callback_id: 'multiselect_dialog_callback',
            title: 'Multiselect Dialog Test',
            introduction_text: 'This is a multiselect dialog for mobile e2e testing',
            elements: [
                {
                    display_name: 'Test Multiselect',
                    name: 'test_multiselect',
                    type: 'select',
                    multiselect: true,
                    default: '',
                    placeholder: 'Choose multiple options',
                    help_text: 'This is a test multiselect input - you can select multiple options',
                    optional: false,
                    options: [
                        {text: 'Option A', value: 'optionA'},
                        {text: 'Option B', value: 'optionB'},
                        {text: 'Option C', value: 'optionC'},
                        {text: 'Option D', value: 'optionD'},
                    ],
                },
            ],
        },
    };
};

// Check if webhook server is running and reachable
const requireWebhookServer = async (webhookBaseUrl: string) => {
    try {
        const response = await client.get(webhookBaseUrl, {
            timeout: 5000,
        });
        
        if (response.status === 200) {
            return { success: true };
        }
        
        throw new Error(`Webhook server returned status ${response.status}`);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        
        const helperMessage = `
**The test you're running requires webhook server to be reachable at ${webhookBaseUrl}**

**Tips:**
1. In local development, you may run "npm start" at "/detox" folder to start webhook server.
2. Make sure the webhook server is running on the correct port (default: 3000).
3. Check that no firewall is blocking the connection.

**Error:** ${errorMessage}`;

        throw new Error(helperMessage);
    }
};

// Helper to open an interactive dialog via the Mattermost API
const apiOpenDialog = async (baseUrl: string, dialog: any) => {
    try {
        // Login as admin to get authentication
        await apiAdminLogin(baseUrl);
        
        // Make the API call to open dialog
        return await client.post(
            `${baseUrl}/api/v4/actions/dialogs/open`,
            dialog,
        );
    } catch (err) {
        return getResponseFromError(err);
    }
};

const Webhook = {
    getSimpleDialog,
    getSelectDialog,
    getMultiselectDialog,
    apiOpenDialog,
    requireWebhookServer,
};

export default Webhook;