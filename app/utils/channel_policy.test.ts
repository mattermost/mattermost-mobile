// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ServerErrors} from '@constants';
import RenderPermissionsStore from '@store/render_permissions_store';
import {getIntlShape} from '@utils/general';

import {expireChannelDecisionsOnDenial, getChannelPolicyDenial, getDmGmPolicyDenial, writeDenialMessage} from './channel_policy';

const serverUrl = 'channel-policy.test.com';
const channelId = 'channelid1';

const serverError = (serverErrorId: string) => Object.assign(new Error('denied'), {server_error_id: serverErrorId, status_code: 403});
const writeDenial = serverError(ServerErrors.CHANNEL_WRITE_ACCESS_DENIED);
const managementDenial = serverError(ServerErrors.CHANNEL_MANAGEMENT_ACCESS_DENIED);
const dmGmWriteDenial = serverError(ServerErrors.DM_GM_WRITE_ACCESS_DENIED);

describe('channel_policy', () => {
    const intl = getIntlShape();

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('getChannelPolicyDenial', () => {
        it('should classify write and management denials, including one wrapped in details', () => {
            expect(getChannelPolicyDenial(writeDenial)).toBe('write');
            expect(getChannelPolicyDenial({details: managementDenial})).toBe('management');
        });

        it('should not classify other errors', () => {
            expect(getChannelPolicyDenial(serverError(ServerErrors.CHANNEL_ACCESS_DENIED))).toBeUndefined();
            expect(getChannelPolicyDenial(new Error('network'))).toBeUndefined();
            expect(getChannelPolicyDenial(dmGmWriteDenial)).toBeUndefined();
        });
    });

    describe('getDmGmPolicyDenial', () => {
        it('should classify the three DM/GM denials, including one wrapped in details', () => {
            expect(getDmGmPolicyDenial(serverError(ServerErrors.DM_GM_START_DENIED))).toBe('start');
            expect(getDmGmPolicyDenial(serverError(ServerErrors.DM_GM_READ_ACCESS_DENIED))).toBe('read');
            expect(getDmGmPolicyDenial({details: dmGmWriteDenial})).toBe('write');
        });

        it('should not classify the channel policy denials or other errors', () => {
            expect(getDmGmPolicyDenial(serverError(ServerErrors.CHANNEL_ACCESS_DENIED))).toBeUndefined();
            expect(getDmGmPolicyDenial(writeDenial)).toBeUndefined();
            expect(getDmGmPolicyDenial(managementDenial)).toBeUndefined();
            expect(getDmGmPolicyDenial(new Error('network'))).toBeUndefined();
        });
    });

    describe('expireChannelDecisionsOnDenial', () => {
        it('should expire the channel decisions on a policy denial', () => {
            const expireEntry = jest.spyOn(RenderPermissionsStore, 'expireEntry');

            expireChannelDecisionsOnDenial(serverUrl, channelId, managementDenial);
            expect(expireEntry).toHaveBeenCalledWith(serverUrl, channelId);
        });

        it('should leave the channel decisions alone on any other error', () => {
            const expireEntry = jest.spyOn(RenderPermissionsStore, 'expireEntry');

            expireChannelDecisionsOnDenial(serverUrl, channelId, new Error('network'));
            expect(expireEntry).not.toHaveBeenCalled();
        });
    });

    describe('writeDenialMessage', () => {
        it('should describe a write denial', () => {
            expect(writeDenialMessage(intl, writeDenial)).toBe('You do not have permission to post in this channel.');
        });

        it('should describe a DM/GM write denial', () => {
            expect(writeDenialMessage(intl, dmGmWriteDenial)).toBe('You do not have permission to send direct or group messages.');
        });

        it('should have no message for a management denial or any other error', () => {
            expect(writeDenialMessage(intl, managementDenial)).toBeUndefined();
            expect(writeDenialMessage(intl, serverError(ServerErrors.DM_GM_READ_ACCESS_DENIED))).toBeUndefined();
            expect(writeDenialMessage(intl, new Error('network'))).toBeUndefined();
        });
    });
});
