// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {Client4} from '@client/rest';
import * as VoiceCallsActions from '@mm-redux/actions/voiceCalls';
import TestHelper from '@test/test_helper';
import configureStore from '@test/test_store';

describe('Actions.VoiceCalls', () => {
    let store;
    beforeAll(async () => {
        await TestHelper.initBasic(Client4);
    });

    beforeEach(async () => {
        store = await configureStore();
    });

    afterAll(async () => {
        await TestHelper.tearDown();
    });

    it('joinCall', async () => {
        await store.dispatch(VoiceCallsActions.addFakeCall('channel-id'));
        await store.dispatch(VoiceCallsActions.joinCall('channel-id'));
        const result = store.getState().entities.voiceCalls.joined;
        assert.equal('channel-id', result);
    });

    it('leaveCall', async () => {
        await store.dispatch(VoiceCallsActions.addFakeCall('channel-id'));
        await store.dispatch(VoiceCallsActions.joinCall('channel-id'));
        let result = store.getState().entities.voiceCalls.joined;
        assert.equal('channel-id', result);
        await store.dispatch(VoiceCallsActions.leaveCall());
        result = store.getState().entities.voiceCalls.joined;
        assert.equal('', result);
    });

    it('muteUser', async () => {
        await store.dispatch(VoiceCallsActions.addFakeCall('channel-id'));
        let result = store.getState().entities.voiceCalls.calls['channel-id'].participants.xohi8cki9787fgiryne716u84o.muted;
        assert.equal(false, result);
        await store.dispatch(VoiceCallsActions.muteUser('channel-id', 'xohi8cki9787fgiryne716u84o'));
        result = store.getState().entities.voiceCalls.calls['channel-id'].participants.xohi8cki9787fgiryne716u84o.muted;
        assert.equal(true, result);
    });

    it('unmuteUser', async () => {
        await store.dispatch(VoiceCallsActions.addFakeCall('channel-id'));
        let result = store.getState().entities.voiceCalls.calls['channel-id'].participants.xohi8cki9787fgiryne716u841.muted;
        assert.equal(true, result);
        await store.dispatch(VoiceCallsActions.unmuteUser('channel-id', 'xohi8cki9787fgiryne716u841'));
        result = store.getState().entities.voiceCalls.calls['channel-id'].participants.xohi8cki9787fgiryne716u841.muted;
        assert.equal(false, result);
    });

    it('raiseHand', async () => {
        await store.dispatch(VoiceCallsActions.addFakeCall('channel-id'));
        let result = store.getState().entities.voiceCalls.calls['channel-id'].participants.xohi8cki9787fgiryne716u84o.handRaised;
        assert.equal(false, result);
        await store.dispatch(VoiceCallsActions.raiseHand('channel-id', 'xohi8cki9787fgiryne716u84o'));
        result = store.getState().entities.voiceCalls.calls['channel-id'].participants.xohi8cki9787fgiryne716u84o.handRaised;
        assert.equal(true, result);
    });

    it('unraiseHand', async () => {
        await store.dispatch(VoiceCallsActions.addFakeCall('channel-id'));
        let result = store.getState().entities.voiceCalls.calls['channel-id'].participants.xohi8cki9787fgiryne716u842.handRaised;
        assert.equal(true, result);
        await store.dispatch(VoiceCallsActions.unraiseHand('channel-id', 'xohi8cki9787fgiryne716u842'));
        result = store.getState().entities.voiceCalls.calls['channel-id'].participants.xohi8cki9787fgiryne716u842.handRaised;
        assert.equal(false, result);
    });
});
