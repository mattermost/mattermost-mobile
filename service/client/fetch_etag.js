// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

const data = {};
const etags = {};

export default (url = null, options = {headers: {}}) => {
    url = url || options.url; // eslint-disable-line no-param-reassign

    if (options.method === 'GET' || !options.method) {
        const etag = etags[url];
        const cachedResponse = data[`${url}${etag}`]; // ensure etag is for url
        if (etag) {
            options.headers['If-None-Match'] = etag;
        }

        return fetch(url, options).
        then((response) => {
            if (response.status === 304) {
                return cachedResponse.clone();
            }

            if (response.status === 200) {
                const responseEtag = response.headers.get('Etag');

                if (responseEtag) {
                    data[`${url}${responseEtag}`] = response.clone();
                    etags[url] = responseEtag;
                }
            }

            return response;
        });
    }

    // all other requests go straight to fetch
    return Reflect.apply(fetch, undefined, [url, options]); //eslint-disable-line no-undefined
};
