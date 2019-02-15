// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import urlParse from 'url-parse';

import {Client4} from 'mattermost-redux/client';
import {ClientError} from 'mattermost-redux/client/client4';

import mattermostBucket from 'app/mattermost_bucket';
import LocalConfig from 'assets/config';

import {t} from 'app/utils/i18n';

/* eslint-disable no-throw-literal */

const HEADER_X_CLUSTER_ID = 'X-Cluster-Id';
const HEADER_TOKEN = 'Token';

const handleRedirectProtocol = (url, response) => {
    const serverUrl = Client4.getUrl();
    const parsed = urlParse(url);
    const {redirects} = response.rnfbRespInfo;
    const redirectUrl = urlParse(redirects[redirects.length - 1]);

    if (serverUrl === parsed.origin && parsed.host === redirectUrl.host && parsed.protocol !== redirectUrl.protocol) {
        Client4.setUrl(serverUrl.replace(parsed.protocol, redirectUrl.protocol));
    }
};

Client4.doFetchWithResponse = async (url, options) => {
    if (!Client4.online) {
        throw new ClientError(Client4.getUrl(), {
            message: 'no internet connection',
            url,
        });
    }

    const customHeaders = LocalConfig.CustomRequestHeaders;
    let waitsForConnectivity = false;
    if (url.includes('/api/v4/system/ping')) {
        waitsForConnectivity = true;
    }
    let requestOptions = {
        ...Client4.getOptions(options),
        waitsForConnectivity,
    };

    if (customHeaders && Object.keys(customHeaders).length > 0) {
        requestOptions = {
            ...requestOptions,
            headers: {
                ...requestOptions.headers,
                ...LocalConfig.CustomRequestHeaders,
            },
        };
    }

    let response;
    let headers;

    let data;
    try {
        response = await fetch(url, requestOptions);
        headers = response.headers;
        if (!url.startsWith('https') && response.rnfbRespInfo && response.rnfbRespInfo.redirects && response.rnfbRespInfo.redirects.length > 1) {
            handleRedirectProtocol(url, response);
        }

        data = await response.json();
    } catch (err) {
        if (response && response.resp && response.resp.data && response.resp.data.includes('SSL certificate')) {
            throw new ClientError(Client4.getUrl(), {
                message: 'You need to use a valid client certificate in order to connect to this Mattermost server',
                status_code: 401,
                url,
            });
        }

        throw new ClientError(Client4.getUrl(), {
            message: 'Received invalid response from the server.',
            intl: {
                id: t('mobile.request.invalid_response'),
                defaultMessage: 'Received invalid response from the server.',
            },
            url,
        });
    }

    if (headers[HEADER_X_CLUSTER_ID] || headers[HEADER_X_CLUSTER_ID.toLowerCase()]) {
        const clusterId = headers[HEADER_X_CLUSTER_ID] || headers[HEADER_X_CLUSTER_ID.toLowerCase()];
        if (clusterId && Client4.clusterId !== clusterId) {
            Client4.clusterId = clusterId;
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

    throw new ClientError(Client4.getUrl(), {
        message: msg,
        server_error_id: data.id,
        status_code: data.status_code,
        url,
    });
};

const initFetchConfig = async () => {
    let fetchConfig = {};
    if (Platform.OS === 'ios') {
        const certificate = await mattermostBucket.getPreference('cert');
        fetchConfig = {
            auto: true,
            certificate,
        };
        window.fetch = new RNFetchBlob.polyfill.Fetch(fetchConfig).build();
    } else {
        fetchConfig = {
            auto: true,
        };
        window.fetch = new RNFetchBlob.polyfill.Fetch(fetchConfig).build();
    }

    return true;
};

initFetchConfig();

export default initFetchConfig;
