/* eslint-disable no-empty-function */

// set this to false to allow requests to server in test suite
const MOCK_FETCH = false;

let fetchMock = {
    mock: () => {},
    delete: () => {},
    get: () => {},
    head: () => {},
    patch: () => {},
    post: () => {},
    put: () => {}
};

if (MOCK_FETCH) {
    fetchMock = require('fetch-mock');
}

export default fetchMock;
