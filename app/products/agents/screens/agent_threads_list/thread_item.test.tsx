// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {Preferences} from '@constants';
import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import ThreadItem, {THREAD_ITEM_HEIGHT} from './thread_item';

import type {AIThread} from '@agents/types';

describe('ThreadItem', () => {
    const mockThread: AIThread = {
        id: 'thread-123',
        channel_id: 'channel-456',
        title: 'Test Conversation',
        message: 'This is a preview of the conversation',
        reply_count: 5,
        update_at: Date.now() - 60000, // 1 minute ago
    };

    const getBaseProps = (): ComponentProps<typeof ThreadItem> => ({
        thread: mockThread,
        onPress: jest.fn(),
        theme: Preferences.THEMES.denim,
    });

    it('should export THREAD_ITEM_HEIGHT constant', () => {
        expect(THREAD_ITEM_HEIGHT).toBe(88);
    });

    it('should render thread title', () => {
        const props = getBaseProps();
        const {getByText} = renderWithIntlAndTheme(<ThreadItem {...props}/>);

        expect(getByText('Test Conversation')).toBeTruthy();
    });

    it('should render default title when thread has no title', () => {
        const props = getBaseProps();
        props.thread = {...mockThread, title: ''};
        const {getByText} = renderWithIntlAndTheme(<ThreadItem {...props}/>);

        expect(getByText('Conversation with Agents')).toBeTruthy();
    });

    it('should render message preview when present', () => {
        const props = getBaseProps();
        const {getByText} = renderWithIntlAndTheme(<ThreadItem {...props}/>);

        expect(getByText('This is a preview of the conversation')).toBeTruthy();
    });

    it('should not render message preview when empty', () => {
        const props = getBaseProps();
        props.thread = {...mockThread, message: ''};
        const {queryByText} = renderWithIntlAndTheme(<ThreadItem {...props}/>);

        // Message should not be present
        expect(queryByText('This is a preview of the conversation')).toBeNull();
    });

    it('should call onPress with thread when pressed', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<ThreadItem {...props}/>);

        fireEvent.press(getByTestId('agent_thread.thread-123'));
        expect(props.onPress).toHaveBeenCalledWith(mockThread);
    });

    it('should render plural "replies" for multiple replies', () => {
        const props = getBaseProps();
        props.thread = {...mockThread, reply_count: 5};
        const {getByText} = renderWithIntlAndTheme(<ThreadItem {...props}/>);

        expect(getByText('5 replies')).toBeTruthy();
    });

    it('should render singular "reply" for one reply', () => {
        const props = getBaseProps();
        props.thread = {...mockThread, reply_count: 1};
        const {getByText} = renderWithIntlAndTheme(<ThreadItem {...props}/>);

        expect(getByText('1 reply')).toBeTruthy();
    });

    it('should render zero replies', () => {
        const props = getBaseProps();
        props.thread = {...mockThread, reply_count: 0};
        const {getByText} = renderWithIntlAndTheme(<ThreadItem {...props}/>);

        expect(getByText('0 replies')).toBeTruthy();
    });

    it('should render bot name tag when provided', () => {
        const props = getBaseProps();
        props.botName = 'AI Assistant';
        const {getByText} = renderWithIntlAndTheme(<ThreadItem {...props}/>);

        expect(getByText('AI Assistant')).toBeTruthy();
    });

    it('should not render bot name tag when not provided', () => {
        const props = getBaseProps();

        // botName is undefined
        const {queryByText} = renderWithIntlAndTheme(<ThreadItem {...props}/>);

        // No bot tag should be rendered
        expect(queryByText('AI Assistant')).toBeNull();
    });

    it('should render with correct testID', () => {
        const props = getBaseProps();
        props.thread = {...mockThread, id: 'unique-thread-id'};
        const {getByTestId} = renderWithIntlAndTheme(<ThreadItem {...props}/>);

        expect(getByTestId('agent_thread.unique-thread-id')).toBeTruthy();
    });
});
