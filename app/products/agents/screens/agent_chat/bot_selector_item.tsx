// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import SlideUpPanelItem from '@components/slide_up_panel_item';

import type AiBotModel from '@agents/types/database/models/ai_bot';

type Props = {
    bot: AiBotModel;
    avatarUrl?: string;
    isSelected: boolean;
    onSelect: (bot: AiBotModel) => void;
    theme: Theme;
};

const BotSelectorItem = ({bot, avatarUrl, isSelected, onSelect, theme}: Props) => {
    const handlePress = useCallback(() => {
        onSelect(bot);
    }, [bot, onSelect]);

    return (
        <SlideUpPanelItem
            leftIcon={avatarUrl ? {uri: avatarUrl} : 'account-outline'}
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
