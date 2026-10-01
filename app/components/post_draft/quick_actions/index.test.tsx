// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {License, Screens} from '@constants';
import {RenderPermissionAction} from '@constants/access_control';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import {PostPriorityType} from '@constants/post';
import DatabaseManager from '@database/manager';
import RenderPermissionsStore, {RENDER_PERMISSIONS_TTL_MS} from '@store/render_permissions_store';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import QuickActions from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

// Stubbed so the control's own database wiring stays out of these tests, but rendered under the
// testID it is given so its presence can still be asserted on.
jest.mock('@components/post_draft/quick_actions/bor_quick_action', () => ({
    __esModule: true,
    default: ({testId}: {testId?: string}) => {
        const {View} = require('react-native');
        return require('react').createElement(View, {testID: testId});
    },
}));

const serverUrl = 'https://quick-actions.test.com';
const channelId = 'channelid1';
const attachmentTestID = 'channel.post_draft.quick_actions.attachment_action';
const borTestID = 'channel.post_draft.quick_actions.bor_action';

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

describe('QuickActions burn-on-read permission', () => {
    let database: Database;
    let operator: ServerDataOperator;

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
            updatePostBoRStatus={jest.fn()}
            focus={jest.fn()}
            location={Screens.CHANNEL}
        />,
        {database, serverUrl},
    );

    const setConfigs = (abacEnabled: boolean, borEnabled: boolean) => operator.handleConfigs({
        configs: [
            {id: 'FeatureFlagPermissionPolicies', value: 'true'},
            {id: 'EnableAttributeBasedAccessControl', value: String(abacEnabled)},
            {id: 'EnableBurnOnRead', value: String(borEnabled)},

            // observeIsMinimumLicenseTier requires this alongside the license record.
            {id: 'BuildEnterpriseReady', value: 'true'},
        ],
        configsToDelete: [],
        prepareRecordsOnly: false,
    });

    const setDecision = (allowed: boolean) => RenderPermissionsStore.setEntry(serverUrl, channelId, {
        epoch: 1,
        decisions: {[RenderPermissionAction.CreateBurnOnReadPost]: {allowed, evaluated: true}},
    }, RENDER_PERMISSIONS_TTL_MS);

    beforeEach(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        operator = server.operator;
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}}],
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        RenderPermissionsStore.removeServer(serverUrl);
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should offer the control on a server that does not govern the action', async () => {
        await setConfigs(false, true);

        const {getByTestId} = renderQuickActions();

        await waitFor(() => expect(getByTestId(borTestID)).toBeTruthy());
    });

    it('should withhold the control until a decision is known', async () => {
        await setConfigs(true, true);

        const {queryByTestId, getByTestId} = renderQuickActions();

        // Waits on a sibling that always renders, so the absence below is checked after the
        // observables have settled rather than before the first paint.
        await waitFor(() => expect(getByTestId(attachmentTestID)).toBeTruthy());
        expect(queryByTestId(borTestID)).toBeNull();
    });

    it('should offer the control when the policy allows it', async () => {
        await setConfigs(true, true);
        setDecision(true);

        const {getByTestId} = renderQuickActions();

        await waitFor(() => expect(getByTestId(borTestID)).toBeTruthy());
    });

    it('should withhold the control when the policy denies it', async () => {
        await setConfigs(true, true);
        setDecision(false);

        const {queryByTestId, getByTestId} = renderQuickActions();

        await waitFor(() => expect(getByTestId(attachmentTestID)).toBeTruthy());
        expect(queryByTestId(borTestID)).toBeNull();
    });

    it('should withhold the control when the feature is off, whatever the policy says', async () => {
        // The policy can only narrow the existing config gate, never widen it.
        await setConfigs(true, false);
        setDecision(true);

        const {queryByTestId, getByTestId} = renderQuickActions();

        await waitFor(() => expect(getByTestId(attachmentTestID)).toBeTruthy());
        expect(queryByTestId(borTestID)).toBeNull();
    });
});
