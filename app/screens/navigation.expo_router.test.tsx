// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import HomeIndex from '@routes/(authenticated)/(home)/index';
import {router} from 'expo-router';
import {act, renderRouter} from 'expo-router/testing-library';

import {Screens} from '@constants';
import {usePropsFromParams} from '@hooks/props_from_params';

import {navigateToScreen, propsToParams, updateParams} from './navigation';

jest.unmock('expo-router');

// Its custom matchers require expect/build/matchers, which expect's package exports don't expose; these tests don't use them.
jest.mock('expo-router/build/testing-library/expect', () => ({}));

const props = {
    password: 'Fall%2025!',
    loginId: 'user%40example.com',
    escaped: '\\%41',
    nested: {values: ['%24%24', '50%off', '%E0%A4%A']},
};

describe('route params through Expo Router', () => {
    let received: Record<string, unknown> | undefined;

    const Probe = () => {
        received = usePropsFromParams<Record<string, unknown>>();
        return null;
    };

    const routes = {
        index: () => null,
        [`(unauthenticated)/${Screens.MFA}`]: Probe,
        '(authenticated)/(home)/index': HomeIndex,
        [`(authenticated)/(home)/${Screens.CHANNEL_LIST}`]: Probe,
    };

    beforeEach(() => {
        received = undefined;
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('preserves percent-encoded sequences when pushing a screen', () => {
        renderRouter(routes);

        act(() => navigateToScreen(Screens.MFA, props));

        expect(received).toEqual(props);
    });

    it('preserves percent-encoded sequences when updating params', () => {
        renderRouter(routes);

        act(() => navigateToScreen(Screens.MFA, {}));
        act(() => updateParams(props));

        expect(received).toEqual(props);
    });

    it('preserves percent-encoded sequences through the home redirect', () => {
        renderRouter(routes);

        act(() => router.replace({pathname: '/(authenticated)/(home)', params: propsToParams(props)}));

        expect(received).toEqual(props);
    });
});
