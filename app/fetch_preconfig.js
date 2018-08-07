// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import RNFetchBlob from 'react-native-fetch-blob';

import {Client4} from 'mattermost-redux/client';
import {General} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import mattermostBucket from 'app/mattermost_bucket';
import LocalConfig from 'assets/config';

const HEADER_X_VERSION_ID = 'X-Version-Id';
const HEADER_X_CLUSTER_ID = 'X-Cluster-Id';
const HEADER_TOKEN = 'Token';

Client4.doFetchWithResponse = async (url, options) => {
    if (!Client4.online) {
        throw {
            message: 'no internet connection',
            url,
        };
    }

    let response;
    let headers;

    let data;
    try {
        response = await fetch(url, Client4.getOptions(options));
        headers = response.headers;

        data = await response.json();
    } catch (err) {
        if (response && response.resp && response.resp.data && response.resp.data.includes('SSL certificate')) {
            throw {
                message: 'You need to use a valid client certificate in order to connect to this Mattermost server',
                status_code: 401,
                url,
            };
        }

        throw {
            message: 'Received invalid response from the server.',
            intl: {
                id: 'mobile.request.invalid_response',
                defaultMessage: 'Received invalid response from the server.',
            },
        };
    }

    // Need to only accept version in the header from requests that are not cached
    // to avoid getting an old version from a cached response
    if ((headers[HEADER_X_VERSION_ID] || headers[HEADER_X_VERSION_ID.toLowerCase()]) &&
        (!headers['Cache-Control'] && !headers['cache-control'])) {
        const serverVersion = headers[HEADER_X_VERSION_ID] || headers[HEADER_X_VERSION_ID.toLowerCase()];
        if (serverVersion && this.serverVersion !== serverVersion) {
            this.serverVersion = serverVersion;
            EventEmitter.emit(General.SERVER_VERSION_CHANGED, serverVersion);
        }
    }

    if (headers[HEADER_X_CLUSTER_ID] || headers[HEADER_X_CLUSTER_ID.toLowerCase()]) {
        const clusterId = headers[HEADER_X_CLUSTER_ID] || headers[HEADER_X_CLUSTER_ID.toLowerCase()];
        if (clusterId && this.clusterId !== clusterId) {
            this.clusterId = clusterId;
        }
    }

    if (headers[HEADER_TOKEN] || headers[HEADER_TOKEN.toLowerCase()]) {
        const token = headers[HEADER_TOKEN] || headers[HEADER_TOKEN.toLowerCase()];
        Client4.setToken(token);
    }

    if (response.ok) {
        const headersMap = new Map();
        Object.keys(headers).forEach((key) => {
            headersMap.set(key, headers[key]);
        });

        return {
            response,
            headers: headersMap,
            data,
        };
    }

    const msg = data.message || '';

    if (Client4.logToConsole) {
        console.error(msg); // eslint-disable-line no-console
    }

    throw {
        message: msg,
        server_error_id: data.id,
        status_code: data.status_code,
        url,
    };
};

if (Platform.OS === 'ios') {
    mattermostBucket.getPreference('cert', LocalConfig.AppGroupId).then((certificate) => {
        window.fetch = new RNFetchBlob.polyfill.Fetch({
            auto: true,
            certificate,
        }).build();
    });
} else {
    window.fetch = new RNFetchBlob.polyfill.Fetch({
        auto: true,
    }).build();
}
