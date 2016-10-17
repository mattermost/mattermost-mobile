/* eslint-disable no-empty-function */

// set this to false to allow requests to server in test suite
const MOCK_FETCH = true;

let fetchMock = require('fetch-mock');

if (!MOCK_FETCH) {
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
