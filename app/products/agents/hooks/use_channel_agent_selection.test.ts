// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook} from '@testing-library/react-native';

import {fetchAIBots} from '@agents/actions/remote/bots';
import {saveSelectedAgent} from '@agents/actions/remote/preference';
import {ChannelAccessLevel} from '@agents/types';

import {useChannelAgentSelection} from './use_channel_agent_selection';

import type AiBotModel from '@agents/types/database/models/ai_bot';

jest.mock('@agents/actions/remote/bots');
jest.mock('@agents/actions/remote/preference');

const makeBot = (id: string, overrides: Partial<AiBotModel> = {}) => ({
    id,
    username: `${id}-user`,
    displayName: id,
    channelAccessLevel: ChannelAccessLevel.All,
    channelIds: [],
    isDefault: false,
    ...overrides,
} as unknown as AiBotModel);

describe('useChannelAgentSelection', () => {
    beforeEach(() => {
        jest.mocked(saveSelectedAgent).mockResolvedValue({preferences: []});
    });

    it('should only offer agents usable in the channel and refresh the bot list on open', () => {
        const open = makeBot('open');
        const blocked = makeBot('blocked', {channelAccessLevel: ChannelAccessLevel.Block, channelIds: ['channel1']});

        const {result} = renderHook(() => useChannelAgentSelection([open, blocked], 'channel1', 'blocked'));

        expect(result.current.channelBots).toEqual([open]);
        expect(result.current.selectedAgent).toBe(open);
        expect(result.current.showPicker).toBe(false);
        expect(fetchAIBots).toHaveBeenCalledTimes(1);
    });

    it('should select and persist an explicitly picked agent', async () => {
        const first = makeBot('first', {isDefault: true});
        const second = makeBot('second');

        const {result} = renderHook(() => useChannelAgentSelection([first, second], 'channel1', ''));
        expect(result.current.selectedAgent).toBe(first);
        expect(result.current.showPicker).toBe(true);

        await act(async () => {
            await result.current.pickAgent(second);
        });

        expect(result.current.selectedAgent).toBe(second);
        expect(saveSelectedAgent).toHaveBeenCalledWith('', 'second');
    });
});
