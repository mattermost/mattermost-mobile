// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PLAYBOOKS_PLUGIN_ID} from '@playbooks/constants/plugin';

export const WEBSOCKET_EVENTS = {
    WEBSOCKET_PLAYBOOK_RUN_UPDATED: `custom_${PLAYBOOKS_PLUGIN_ID}_playbook_run_updated`,
    WEBSOCKET_PLAYBOOK_RUN_CREATED: `custom_${PLAYBOOKS_PLUGIN_ID}_playbook_run_created`,
    WEBSOCKET_PLAYBOOK_RUN_UPDATED_INCREMENTAL: `custom_${PLAYBOOKS_PLUGIN_ID}_playbook_run_updated_incremental`,
    WEBSOCKET_PLAYBOOK_CHECKLIST_UPDATED: `custom_${PLAYBOOKS_PLUGIN_ID}_playbook_checklist_updated`,
    WEBSOCKET_PLAYBOOK_CHECKLIST_ITEM_UPDATED: `custom_${PLAYBOOKS_PLUGIN_ID}_playbook_checklist_item_updated`,
};
