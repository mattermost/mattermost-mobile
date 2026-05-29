// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import * as integrationActions from '@actions/remote/integrations';
import * as serverContext from '@context/server';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import InlineActionButton from './inline_action_button';

jest.mock('@actions/remote/integrations');
jest.mock('@context/server', () => ({
    ...jest.requireActual('@context/server'),
    useServerUrl: jest.fn(),
}));

const SERVER_URL = 'https://server.com';
const POST_ID = 'post1';
const VALID_HREF = 'mmaction://MxPlan?row=12';

beforeEach(() => {
    jest.mocked(serverContext.useServerUrl).mockReturnValue(SERVER_URL);
});

afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
});

describe('InlineActionButton', () => {
    it('should render button with label for valid href', () => {
        const {getByTestId, getByText} = renderWithIntlAndTheme(
            <InlineActionButton
                href={VALID_HREF}
                postId={POST_ID}
                baseTextStyle={null}
            >
                {'Click me'}
            </InlineActionButton>,
        );

        expect(getByTestId('inline_action_button')).toBeTruthy();
        expect(getByText('Click me')).toBeTruthy();
    });

    it('should fall back to children when scheme is wrong', () => {
        const {queryByTestId, getByText} = renderWithIntlAndTheme(
            <InlineActionButton
                href='https://example.com'
                postId={POST_ID}
                baseTextStyle={null}
            >
                {'children-text'}
            </InlineActionButton>,
        );

        expect(queryByTestId('inline_action_button')).toBeNull();
        expect(getByText('children-text')).toBeTruthy();
    });

    it('should fall back when action id has invalid chars', () => {
        const {queryByTestId, getByText} = renderWithIntlAndTheme(
            <InlineActionButton
                href='mmaction://Mx-Plan'
                postId={POST_ID}
                baseTextStyle={null}
            >
                {'children-text'}
            </InlineActionButton>,
        );

        expect(queryByTestId('inline_action_button')).toBeNull();
        expect(getByText('children-text')).toBeTruthy();
    });

    it('should fall back when params exceed 2048 bytes', () => {
        const {queryByTestId, getByText} = renderWithIntlAndTheme(
            <InlineActionButton
                href={'mmaction://x?p=' + 'a'.repeat(2049)}
                postId={POST_ID}
                baseTextStyle={null}
            >
                {'children-text'}
            </InlineActionButton>,
        );

        expect(queryByTestId('inline_action_button')).toBeNull();
        expect(getByText('children-text')).toBeTruthy();
    });

    it('should fall back when postId is empty', () => {
        const {queryByTestId, getByText} = renderWithIntlAndTheme(
            <InlineActionButton
                href='mmaction://x?p=1'
                postId=''
                baseTextStyle={null}
            >
                {'children-text'}
            </InlineActionButton>,
        );

        expect(queryByTestId('inline_action_button')).toBeNull();
        expect(getByText('children-text')).toBeTruthy();
    });

    it('should dispatch postActionWithQuery with parsed query on press', async () => {
        jest.mocked(integrationActions.postActionWithQuery).mockResolvedValue({data: {}});

        const {getByTestId} = renderWithIntlAndTheme(
            <InlineActionButton
                href='mmaction://MxPlan?row=12&col=A'
                postId={POST_ID}
                baseTextStyle={null}
            >
                {'Click me'}
            </InlineActionButton>,
        );

        fireEvent.press(getByTestId('inline_action_button'));

        await act(async () => {
            await new Promise((resolve) => process.nextTick(resolve));
        });

        expect(integrationActions.postActionWithQuery).toHaveBeenCalledWith(
            SERVER_URL,
            POST_ID,
            'MxPlan',
            {row: '12', col: 'A'},
        );
    });

    it('should not dispatch twice on rapid double press', async () => {
        jest.mocked(integrationActions.postActionWithQuery).mockReturnValue(new Promise(() => {}));

        const {getByTestId} = renderWithIntlAndTheme(
            <InlineActionButton
                href={VALID_HREF}
                postId={POST_ID}
                baseTextStyle={null}
            >
                {'Click me'}
            </InlineActionButton>,
        );

        const button = getByTestId('inline_action_button');
        fireEvent.press(button);
        fireEvent.press(button);

        expect(integrationActions.postActionWithQuery).toHaveBeenCalledTimes(1);
    });

    it('should render error label when dispatch resolves with error', async () => {
        jest.mocked(integrationActions.postActionWithQuery).mockResolvedValue({error: new Error('boom')});

        const {getByTestId, getByText} = renderWithIntlAndTheme(
            <InlineActionButton
                href={VALID_HREF}
                postId={POST_ID}
                baseTextStyle={null}
            >
                {'Click me'}
            </InlineActionButton>,
        );

        fireEvent.press(getByTestId('inline_action_button'));

        await act(async () => {
            await new Promise((resolve) => process.nextTick(resolve));
        });

        expect(getByText('Action failed to execute.')).toBeTruthy();
    });

    it('should render timeout error when dispatch hangs past 15s', async () => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        jest.mocked(integrationActions.postActionWithQuery).mockReturnValue(new Promise(() => {}));

        const {getByTestId, getByText} = renderWithIntlAndTheme(
            <InlineActionButton
                href={VALID_HREF}
                postId={POST_ID}
                baseTextStyle={null}
            >
                {'Click me'}
            </InlineActionButton>,
        );

        fireEvent.press(getByTestId('inline_action_button'));

        await act(async () => {
            jest.advanceTimersByTime(15000);
            await new Promise((resolve) => process.nextTick(resolve));
        });

        expect(getByText('Action timed out. Try again.')).toBeTruthy();
    });

    it('should not setState after unmount', async () => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        jest.mocked(integrationActions.postActionWithQuery).mockReturnValue(new Promise(() => {}));

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const {getByTestId, unmount} = renderWithIntlAndTheme(
            <InlineActionButton
                href={VALID_HREF}
                postId={POST_ID}
                baseTextStyle={null}
            >
                {'Click me'}
            </InlineActionButton>,
        );

        fireEvent.press(getByTestId('inline_action_button'));
        unmount();

        await act(async () => {
            jest.advanceTimersByTime(15000);
            await new Promise((resolve) => process.nextTick(resolve));
        });

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
