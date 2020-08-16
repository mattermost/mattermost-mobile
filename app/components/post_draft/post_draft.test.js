// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import TestRenderer from 'react-test-renderer';
import {IntlProvider} from 'react-intl';
import {Provider} from 'react-redux';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import Preferences from '@mm-redux/constants/preferences';
import intitialState from '@store/initial_state';

import PostDraft from './post_draft';

const mockStore = configureMockStore([thunk]);
const state = {
    ...intitialState,
    entities: {
        ...intitialState.entities,
        channels: {
            ...intitialState.entities.channels,
            channels: {
                'channel-id': {
                    id: 'channel-id',
                    name: 'test-channel',
                    display_name: 'Display Name',
                    type: 'O',
                },
            },
            channelMemberCountsByGroup: {},
        },
    },
    device: {
        ...intitialState.device,
        dimension: {
            deviceWidth: 375,
            deviceHeight: 812,
        },
    },
};
const store = mockStore(state);

jest.mock('react-native-image-picker', () => ({
    launchCamera: jest.fn(),
}));

describe('PostDraft', () => {
    const baseProps = {
        canPost: true,
        channelId: 'channel-id',
        channelIsArchived: false,
        channelIsReadOnly: false,
        deactivatedChannel: false,
        registerTypingAnimation: jest.fn(),
        rootId: '',
        screenId: 'NavigationScreen1',
        theme: Preferences.THEMES.default,
    };

    test('Should render the DraftInput', () => {
        const wrapper = renderWithRedux(
            <PostDraft
                {...baseProps}
            />,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
        const element = wrapper.root.find((el) => el.type === 'TextInput');
        expect(element).toBeTruthy();
    });

    test('Should render the Archived for channelIsArchived', () => {
        const wrapper = renderWithRedux(
            <PostDraft
                {...baseProps}
                channelIsArchived={true}
            />,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
        const element = wrapper.root.find((el) => el.type === 'Text' && el.children && el.children[0] === 'archived channel');
        expect(element).toBeTruthy();
    });

    test('Should render the Archived for deactivatedChannel', () => {
        const wrapper = renderWithRedux(
            <PostDraft
                {...baseProps}
                deactivatedChannel={true}
            />,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
        const element = wrapper.root.find((el) => el.type === 'Text' && el.children && el.children[0] === 'archived channel');
        expect(element).toBeTruthy();
    });

    test('Should render the ReadOnly for channelIsReadOnly', () => {
        const wrapper = renderWithRedux(
            <PostDraft
                {...baseProps}
                channelIsReadOnly={true}
            />,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
        const element = wrapper.root.find((el) => el.type === 'Text' && el.children && el.children[0] === 'This channel is read-only.');
        expect(element).toBeTruthy();
    });

    test('Should render the ReadOnly for canPost', () => {
        const wrapper = renderWithRedux(
            <PostDraft
                {...baseProps}
                canPost={false}
            />,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
        const element = wrapper.root.find((el) => el.type === 'Text' && el.children && el.children[0] === 'This channel is read-only.');
        expect(element).toBeTruthy();
    });
});

function renderWithRedux(component) {
    return TestRenderer.create(
        <Provider store={store}>
            <IntlProvider locale='en'>
                {component}
            </IntlProvider>
        </Provider>,
    );
}