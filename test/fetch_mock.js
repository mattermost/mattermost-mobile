/* eslint-disable no-empty-function */

import config from 'config/config';
const {MockFetchInTests} = config;

let fetchMock = require('fetch-mock');

if (!MockFetchInTests) {
    fetchMock.restore();
    fetchMock = {
        mock: () => {},
        delete: () => {},
        get: () => {},
        head: () => {},
        patch: () => {},
        post: () => {},
        put: () => {}
    };
}

export default fetchMock;
