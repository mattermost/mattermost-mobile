// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import _ from 'lodash';
import {requestData, requestSuccess, requestFailure} from './helpers.js';
import Client from 'client/client_instance';
import {ChannelsTypes as types} from 'constants';

export function selectChannel(channel) {
    return {
        type: types.SELECT_CHANNEL,
        channel_id: channel.id
    };
}

export function fetchChannels() {
    return async (dispatch) => {
        try {
            dispatch(requestData(types.FETCH_CHANNELS_REQUEST));
            const url = `${Client.getChannelsRoute()}/`;
            const resp = await fetch(url, {
                headers: {
                    Authorization: 'Bearer bpfzjdtxybddtnfptmt78hghqo'
                }
            });
            let data;
            const contentType = _.first(resp.headers.map['content-type']) || 'unknown';
            if (contentType === 'application/json') {
                data = await resp.json();
            } else {
                data = await resp.text();
            }
            if (resp.ok) {
                // TODO: extract members from response
                dispatch(requestSuccess(types.FETCH_CHANNELS_SUCCESS, data.channels));
            } else {
                let msg;
                if (contentType === 'application/json') {
                    msg = data.message;
                } else {
                    msg = data;
                }
                throw new Error(msg);
            }
        } catch (err) {
            dispatch(requestFailure(types.FETCH_CHANNELS_FAILURE, err));
        }
    };
}
