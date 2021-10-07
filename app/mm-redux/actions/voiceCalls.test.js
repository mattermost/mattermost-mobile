// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {Client4} from '@client/rest';
import {VoiceCallsTypes} from '@mm-redux/action_types';
import * as VoiceCallsActions from '@mm-redux/actions/voiceCalls';
import TestHelper from '@test/test_helper';
import configureStore from '@test/test_store';

export function addFakeCall(channelId) {
    return {
        type: VoiceCallsTypes.RECEIVED_VOICE_CALL_STARTED,
        data: {
            participants: {
                xohi8cki9787fgiryne716u84o: {id: 'xohi8cki9787fgiryne716u84o', isTalking: true, muted: false},
                xohi8cki9787fgiryne716u841: {id: 'xohi8cki9787fgiryne716u84o', isTalking: true, muted: true},
                xohi8cki9787fgiryne716u842: {id: 'xohi8cki9787fgiryne716u84o', isTalking: false, uted: false},
                xohi8cki9787fgiryne716u843: {id: 'xohi8cki9787fgiryne716u84o', isTalking: false, muted: true},
                xohi8cki9787fgiryne716u844: {id: 'xohi8cki9787fgiryne716u84o', isTalking: true, muted: false},
                xohi8cki9787fgiryne716u845: {id: 'xohi8cki9787fgiryne716u84o', isTalking: true, muted: true},
            },
            channelId,
            startTime: (new Date()).getTime(),
        },
    };
}

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
        await store.dispatch(addFakeCall('channel-id'));
        await store.dispatch(VoiceCallsActions.joinCall('channel-id'));
        const result = store.getState().entities.voiceCalls.joined;
        assert.equal('channel-id', result);
    });

    it('leaveCall', async () => {
        await store.dispatch(addFakeCall('channel-id'));
        await store.dispatch(VoiceCallsActions.joinCall('channel-id'));
        let result = store.getState().entities.voiceCalls.joined;
        assert.equal('channel-id', result);
        await store.dispatch(VoiceCallsActions.leaveCall());
        result = store.getState().entities.voiceCalls.joined;
        assert.equal('', result);
    });

    it('muteUser', async () => {
        await store.dispatch(addFakeCall('channel-id'));
        let result = store.getState().entities.voiceCalls.calls['channel-id'].participants.xohi8cki9787fgiryne716u84o.muted;
        assert.equal(false, result);
        await store.dispatch(VoiceCallsActions.muteUser('channel-id', 'xohi8cki9787fgiryne716u84o'));
        result = store.getState().entities.voiceCalls.calls['channel-id'].participants.xohi8cki9787fgiryne716u84o.muted;
        assert.equal(true, result);
    });

    it('unmuteUser', async () => {
        await store.dispatch(addFakeCall('channel-id'));
        let result = store.getState().entities.voiceCalls.calls['channel-id'].participants.xohi8cki9787fgiryne716u841.muted;
        assert.equal(true, result);
        await store.dispatch(VoiceCallsActions.unmuteUser('channel-id', 'xohi8cki9787fgiryne716u841'));
        result = store.getState().entities.voiceCalls.calls['channel-id'].participants.xohi8cki9787fgiryne716u841.muted;
        assert.equal(false, result);
    });
});
