// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Screens} from '@constants';
import {RenderPermissionAction} from '@constants/access_control';
import {PostPriorityType} from '@constants/post';
import DatabaseManager from '@database/manager';
import RenderPermissionsStore, {RENDER_PERMISSIONS_TTL_MS} from '@store/render_permissions_store';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import QuickActions from './index';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@components/post_draft/quick_actions/bor_quick_action', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const serverUrl = 'https://quick-actions.test.com';
const channelId = 'channelid1';
const attachmentTestID = 'channel.post_draft.quick_actions.attachment_action';

describe('QuickActions upload permission', () => {
    let database: Database;

    const renderQuickActions = () => renderWithEverything(
        <QuickActions
            testID='channel.post_draft.quick_actions'
            channelId={channelId}
            fileCount={0}
            addFiles={jest.fn()}
            updateValue={jest.fn()}
            value=''
            postPriority={{priority: PostPriorityType.STANDARD}}
            updatePostPriority={jest.fn()}
            focus={jest.fn()}
            location={Screens.CHANNEL}
        />,
        {database, serverUrl},
    );

    beforeEach(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        await server.operator.handleConfigs({
            configs: [
                {id: 'FeatureFlagPermissionPolicies', value: 'true'},
                {id: 'EnableAttributeBasedAccessControl', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        RenderPermissionsStore.removeServer(serverUrl);
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should make the attachment button inert when a policy denies uploads in the channel', async () => {
        // Seeded before render: the test renderer cannot run the button's opacity animation on update.
        RenderPermissionsStore.setEntry(serverUrl, channelId, {
            epoch: 1,
            decisions: {[RenderPermissionAction.UploadFileAttachment]: {allowed: false, evaluated: true}},
        }, RENDER_PERMISSIONS_TTL_MS);

        const {getByTestId} = renderQuickActions();

        await waitFor(() => expect(getByTestId(`${attachmentTestID}.disabled`)).toBeTruthy());
    });

    it('should keep the attachment button usable while no decision is known', async () => {
        const {getByTestId} = renderQuickActions();

        await waitFor(() => expect(getByTestId(attachmentTestID)).toBeTruthy());
    });
});
