// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import SlideUpPanelItem from '@components/slide_up_panel_item';

export type AgentSelectorItem = {
    id: string;
    displayName: string;
    avatarUrl?: string;
    isLocal?: boolean;
};

type Props = {
    bot: AgentSelectorItem;
    isSelected: boolean;
    onSelect: (bot: AgentSelectorItem) => void;
    theme: Theme;
};

function leftIconForBot(bot: AgentSelectorItem) {
    if (bot.avatarUrl) {
        return {uri: bot.avatarUrl} as const;
    }
    if (bot.isLocal) {
        return 'creation-outline' as const;
    }
    return 'account-outline' as const;
}

const BotSelectorItem = ({bot, isSelected, onSelect, theme}: Props) => {
    const handlePress = useCallback(() => {
        onSelect(bot);
    }, [bot, onSelect]);

    return (
        <SlideUpPanelItem
            leftIcon={leftIconForBot(bot)}
            leftImageStyles={{borderRadius: 12}}
            onPress={handlePress}
            testID={`agent_chat.bot_selector.bot_item.${bot.id}`}
            text={bot.displayName}
            rightIcon={isSelected ? 'check' : undefined}
            rightIconStyles={{color: theme.linkColor}}
        />
    );
};

export default BotSelectorItem;
