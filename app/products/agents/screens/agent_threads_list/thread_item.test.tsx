// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {Preferences} from '@constants';
import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import ThreadItem from './thread_item';

import type AiThreadModel from '@agents/types/database/models/ai_thread';

describe('ThreadItem', () => {
    // Mock thread data with camelCase properties matching AiThreadModel
    const mockThread = {
        id: 'thread-123',
        channelId: 'channel-456',
        title: 'Test Conversation',
        message: 'This is a preview of the conversation',
        replyCount: 5,
        updateAt: Date.now() - 60000, // 1 minute ago
    } as unknown as unknown as AiThreadModel;

    const getBaseProps = (): ComponentProps<typeof ThreadItem> => ({
        thread: mockThread,
        onPress: jest.fn(),
        theme: Preferences.THEMES.denim,
    });

    it('should render thread title', () => {
        const props = getBaseProps();
        const {getByText} = renderWithIntlAndTheme(<ThreadItem {...props}/>);

        expect(getByText('Test Conversation')).toBeTruthy();
    });

    it('should render default title when thread has no title', () => {
        const props = getBaseProps();
        props.thread = {...mockThread, title: ''} as unknown as AiThreadModel;
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
        props.thread = {...mockThread, message: ''} as unknown as AiThreadModel;
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
        props.thread = {...mockThread, replyCount: 5} as unknown as AiThreadModel;
        const {getByText} = renderWithIntlAndTheme(<ThreadItem {...props}/>);

        expect(getByText('5 replies')).toBeTruthy();
    });

    it('should render singular "reply" for one reply', () => {
        const props = getBaseProps();
        props.thread = {...mockThread, replyCount: 1} as unknown as AiThreadModel;
        const {getByText} = renderWithIntlAndTheme(<ThreadItem {...props}/>);

        expect(getByText('1 reply')).toBeTruthy();
    });

    it('should render zero replies', () => {
        const props = getBaseProps();
        props.thread = {...mockThread, replyCount: 0} as unknown as AiThreadModel;
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
        props.thread = {...mockThread, id: 'unique-thread-id'} as unknown as AiThreadModel;
        const {getByTestId} = renderWithIntlAndTheme(<ThreadItem {...props}/>);

        expect(getByTestId('agent_thread.unique-thread-id')).toBeTruthy();
    });
});
