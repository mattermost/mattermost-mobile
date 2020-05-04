// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import {dispatchWithRetry} from './general';

describe('Actions.Helpers.General', () => {
    describe('dispatchWithRetry', () => {
        const MAX_RETRIES = 5;
        const expectedAction = {type: 'EXPECTED_ACTION'};
        const failureResponse = {error: true};
        const successResponse = {data: true};
        const actionFunc = jest.fn();
        const createMockStore = configureStore([thunk]);
        let store;

        beforeEach(() => {
            store = createMockStore({});
            actionFunc.mockReset();
        });

        it('dispatches action once and returns if no error', async () => {
            actionFunc.mockImplementation((dispatch) => {
                dispatch(expectedAction);

                return successResponse;
            });

            const response = await store.dispatch(dispatchWithRetry(actionFunc, MAX_RETRIES));
            const expectedActions = [expectedAction];

            expect(response).toStrictEqual(successResponse);
            expect(store.getActions()).toStrictEqual(expectedActions);
        });

        it('dispatches action at least once if maxTries < 1', async () => {
            actionFunc.mockImplementation((dispatch) => {
                dispatch(expectedAction);

                return failureResponse;
            });

            const response = await store.dispatch(dispatchWithRetry(actionFunc, 0));
            const expectedActions = [expectedAction];

            expect(response).toStrictEqual(failureResponse);
            expect(store.getActions()).toStrictEqual(expectedActions);
        });

        it('dispatches action twice if first attempt fails but second succeeds', async () => {
            actionFunc.
                mockImplementationOnce((dispatch) => {
                    dispatch(expectedAction);

                    return failureResponse;
                }).
                mockImplementationOnce((dispatch) => {
                    dispatch(expectedAction);

                    return successResponse;
                });

            const response = await store.dispatch(dispatchWithRetry(actionFunc, MAX_RETRIES));
            const expectedActions = Array(2).fill(expectedAction);

            expect(response).toStrictEqual(successResponse);
            expect(store.getActions()).toStrictEqual(expectedActions);
        });

        it('dispatches action MAX_RETRIES times when all attempts fail', async () => {
            actionFunc.mockImplementation((dispatch) => {
                dispatch(expectedAction);

                return failureResponse;
            });

            const response = await store.dispatch(dispatchWithRetry(actionFunc, MAX_RETRIES));
            const expectedActions = Array(MAX_RETRIES).fill(expectedAction);

            expect(response).toStrictEqual(failureResponse);
            expect(store.getActions()).toStrictEqual(expectedActions);
        });
    });
});
