// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {requestChannelSummary} from '@agents/actions/remote/channel_summary';
import {CHANNEL_ANALYSIS_TYPES} from '@agents/constants';
import {ChannelAccessLevel} from '@agents/types';
import {act, fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import ChannelSummarySheet from './channel_summary_sheet';

import type AiBotModel from '@agents/types/database/models/ai_bot';

const SERVER_URL = 'https://test.mattermost.com';
const CHANNEL_ID = 'channel1';

jest.mock('@context/server', () => ({
    useServerUrl: () => 'https://test.mattermost.com',
}));
jest.mock('@agents/actions/remote/channel_summary', () => ({
    requestChannelSummary: jest.fn().mockResolvedValue({}),
}));
jest.mock('@agents/actions/remote/bots', () => ({
    fetchAIBots: jest.fn().mockResolvedValue({}),
}));
jest.mock('@agents/actions/remote/preference', () => ({
    saveSelectedAgent: jest.fn().mockResolvedValue({}),
}));
jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn(),
}));
jest.mock('@gorhom/bottom-sheet', () => {
    const {ScrollView} = require('react-native');
    return {BottomSheetScrollView: ScrollView};
});

// The real picker is a calendar; a single button that submits a fixed local
// range is enough to exercise the sheet's UTC normalization.
jest.mock('./date_range_picker', () => {
    const {Pressable} = require('react-native');
    const MockDateRangePicker = ({onSubmit}: {onSubmit: (since: Date, until: Date) => void}) => (
        <Pressable
            testID='mock.date_range_picker.submit'
            onPress={() => onSubmit(new Date(2026, 2, 3, 15, 30), new Date(2026, 2, 9, 8, 0))}
        />
    );
    return MockDateRangePicker;
});

const bot = {
    id: 'bot1',
    displayName: 'Agent',
    username: 'agent',
    lastIconUpdate: 0,
    dmChannelId: 'dm1',
    channelAccessLevel: ChannelAccessLevel.All,
    channelIds: [],
    isDefault: true,
} as unknown as AiBotModel;

function renderSheet(viewedAt: number) {
    return renderWithIntlAndTheme(
        <ChannelSummarySheet
            channelId={CHANNEL_ID}
            bots={[bot]}
            selectedAgentId=''
            viewedAt={viewedAt}
        />,
    );
}

describe('ChannelSummarySheet', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should hide "Summarize unreads" when the channel has no previous visit', () => {
        const {queryByTestId, getByTestId} = renderSheet(0);

        expect(queryByTestId('agents.channel_summary.option.unreads')).toBeNull();
        expect(getByTestId('agents.channel_summary.option.7d')).toBeTruthy();
    });

    it('should bound "Summarize unreads" by the previous visit', async () => {
        const viewedAt = Date.UTC(2026, 0, 15, 12, 0, 0);
        const {getByTestId} = renderSheet(viewedAt);

        await act(async () => {
            fireEvent.press(getByTestId('agents.channel_summary.option.unreads'));
        });

        expect(requestChannelSummary).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, CHANNEL_ANALYSIS_TYPES.SUMMARIZE_UNREADS, 'agent', {
            since: '2026-01-15T12:00:00.000Z',
            prompt: undefined,
        });
    });

    it('should send a day window with the trimmed typed prompt as extra instructions', async () => {
        const {getByTestId} = renderSheet(0);

        fireEvent.changeText(getByTestId('agents.channel_summary.prompt_input'), '  focus on bugs  ');
        await act(async () => {
            fireEvent.press(getByTestId('agents.channel_summary.option.14d'));
        });

        expect(requestChannelSummary).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, CHANNEL_ANALYSIS_TYPES.DAYS, 'agent', {
            days: 14,
            prompt: 'focus on bugs',
        });
    });

    it('should send a custom analysis when the typed prompt is submitted', async () => {
        const {getByTestId} = renderSheet(0);

        fireEvent.changeText(getByTestId('agents.channel_summary.prompt_input'), 'What was decided?');
        await act(async () => {
            fireEvent.press(getByTestId('agents.channel_summary.prompt_submit'));
        });

        expect(requestChannelSummary).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, CHANNEL_ANALYSIS_TYPES.CUSTOM, 'agent', {
            prompt: 'What was decided?',
        });
    });

    it('should send a date range covering whole UTC days', async () => {
        const {getByTestId} = renderSheet(0);

        fireEvent.press(getByTestId('agents.channel_summary.option.custom'));
        await act(async () => {
            fireEvent.press(getByTestId('mock.date_range_picker.submit'));
        });

        expect(requestChannelSummary).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, CHANNEL_ANALYSIS_TYPES.DATE_RANGE, 'agent', {
            since: '2026-03-03T00:00:00.000Z',
            until: '2026-03-09T23:59:59.000Z',
            prompt: undefined,
        });
    });
});
