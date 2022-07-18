// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppsTypes} from '@mm-redux/action_types';

import * as Reducers from './apps';

describe('bindings', () => {
    const initialState = [];
    const basicSubmitForm = {
        submit: {
            path: '/submit_url',
        },
    };
    test('No element get filtered', () => {
        const data = [
            {
                app_id: '1',
                location: '/post_menu',
                bindings: [
                    {
                        location: 'locA',
                        label: 'a',
                        form: basicSubmitForm,
                    },
                ],
            },
            {
                app_id: '2',
                location: '/post_menu',
                bindings: [
                    {
                        location: 'locA',
                        label: 'a',
                        form: basicSubmitForm,
                    },
                ],
            },
            {
                app_id: '1',
                location: '/channel_header',
                bindings: [
                    {
                        location: 'locB',
                        label: 'b',
                        icon: 'icon',
                        form: basicSubmitForm,
                    },
                ],
            },
            {
                app_id: '3',
                location: '/command',
                bindings: [
                    {
                        location: 'locC',
                        label: 'c',
                        form: basicSubmitForm,
                    },
                ],
            },
        ];

        const state = Reducers.bindings(
            initialState,
            {
                type: AppsTypes.RECEIVED_APP_BINDINGS,
                data,
            },
        );

        expect(state).toMatchSnapshot();
    });

    test('Invalid channel header get filtered', () => {
        const data = [
            {
                app_id: '1',
                location: '/post_menu',
                bindings: [
                    {
                        location: 'locA',
                        label: 'a',
                        form: basicSubmitForm,
                    },
                ],
            },
            {
                app_id: '2',
                location: '/post_menu',
                bindings: [
                    {
                        location: 'locA',
                        label: 'a',
                        form: basicSubmitForm,
                    },
                ],
            },
            {
                app_id: '1',
                location: '/channel_header',
                bindings: [
                    {
                        location: 'locB',
                        label: 'b',
                        icon: 'icon',
                        form: basicSubmitForm,
                    },
                    {
                        location: 'locC',
                        label: 'c',
                        form: basicSubmitForm,
                    },
                ],
            },
            {
                app_id: '2',
                location: '/channel_header',
                bindings: [
                    {
                        icon: 'icon',
                        form: basicSubmitForm,
                    },
                    {
                        location: 'locC',
                        label: 'c',
                        icon: 'icon',
                        form: basicSubmitForm,
                    },
                ],
            },
            {
                app_id: '3',
                location: '/channel_header',
                bindings: [
                    {
                        location: 'locB',
                        form: basicSubmitForm,
                    },
                    {
                        location: 'locC',
                        label: 'c',
                        form: basicSubmitForm,
                    },
                ],
            },
            {
                app_id: '3',
                location: '/command',
                bindings: [
                    {
                        location: 'locC',
                        label: 'c',
                        form: basicSubmitForm,
                    },
                ],
            },
        ];

        const state = Reducers.bindings(
            initialState,
            {
                type: AppsTypes.RECEIVED_APP_BINDINGS,
                data,
            },
        );

        expect(state).toMatchSnapshot();
    });

    test('Invalid post menu get filtered', () => {
        const data = [
            {
                app_id: '1',
                location: '/post_menu',
                bindings: [
                    {
                        form: basicSubmitForm,
                    },
                    {
                        location: 'locB',
                        label: 'a',
                        form: basicSubmitForm,
                    },
                ],
            },
            {
                app_id: '2',
                location: '/post_menu',
                bindings: [
                    {
                        location: 'locA',
                        label: 'a',
                        form: basicSubmitForm,
                    },
                    {
                        location: 'locB',
                        label: 'b',
                        form: basicSubmitForm,
                    },
                ],
            },
            {
                app_id: '3',
                location: '/post_menu',
                bindings: [
                    {
                        form: basicSubmitForm,
                    },
                ],
            },
            {
                app_id: '1',
                location: '/channel_header',
                bindings: [
                    {
                        location: 'locB',
                        label: 'b',
                        icon: 'icon',
                        form: basicSubmitForm,
                    },
                ],
            },
            {
                app_id: '3',
                location: '/command',
                bindings: [
                    {
                        location: 'locC',
                        label: 'c',
                        form: basicSubmitForm,
                    },
                ],
            },
        ];

        const state = Reducers.bindings(
            initialState,
            {
                type: AppsTypes.RECEIVED_APP_BINDINGS,
                data,
            },
        );

        expect(state).toMatchSnapshot();
    });

    test('Invalid commands get filtered', () => {
        const data = [
            {
                app_id: '1',
                location: '/post_menu',
                bindings: [
                    {
                        location: 'locA',
                        label: 'a',
                        form: basicSubmitForm,
                    },
                    {
                        location: 'locB',
                        label: 'a',
                        form: basicSubmitForm,
                    },
                ],
            },
            {
                app_id: '1',
                location: '/channel_header',
                bindings: [
                    {
                        location: 'locB',
                        label: 'b',
                        icon: 'icon',
                        form: basicSubmitForm,
                    },
                ],
            },
            {
                app_id: '3',
                location: '/command',
                bindings: [
                    {
                        location: 'locC',
                        label: 'c',
                        bindings: [
                            {
                                form: basicSubmitForm,
                            },
                            {
                                location: 'subC2',
                                label: 'c2',
                                form: basicSubmitForm,
                            },
                        ],
                    },
                    {
                        location: 'locD',
                        label: 'd',
                        bindings: [
                            {
                                form: basicSubmitForm,
                            },
                        ],
                    },
                ],
            },
            {
                app_id: '1',
                location: '/command',
                bindings: [
                    {
                        form: basicSubmitForm,
                    },
                ],
            },
            {
                app_id: '2',
                location: '/command',
                bindings: [
                    {
                        location: 'locC',
                        label: 'c',
                        bindings: [
                            {
                                location: 'subC1',
                                label: 'c1',
                                form: basicSubmitForm,
                            },
                            {
                                location: 'subC2',
                                label: 'c2',
                                form: basicSubmitForm,
                            },
                        ],
                    },
                ],
            },
        ];

        const state = Reducers.bindings(
            initialState,
            {
                type: AppsTypes.RECEIVED_APP_BINDINGS,
                data,
            },
        );

        expect(state).toMatchSnapshot();
    });
});
