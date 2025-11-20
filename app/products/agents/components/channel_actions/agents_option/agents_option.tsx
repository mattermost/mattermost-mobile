// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {goToAgentChat} from '@agents/screens/navigation';
import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Platform} from 'react-native';

import OptionItem from '@components/option_item';
import SlideUpPanelItem from '@components/slide_up_panel_item';
import {dismissBottomSheet} from '@screens/navigation';

type Props = {
    location: 'channel_actions' | 'quick_actions' | 'account_menu';
}

const messages = defineMessages({
    agents: {
        id: 'agents.menu.title',
        defaultMessage: 'Agents',
    },
});

const AgentsOption = ({
    location,
}: Props) => {
    const intl = useIntl();

    const onPress = useCallback(async () => {
        await dismissBottomSheet();
        goToAgentChat(intl);
    }, [intl]);

    if (location === 'quick_actions' || location === 'account_menu') {
        return (
            <SlideUpPanelItem
                onPress={onPress}
                text={intl.formatMessage(messages.agents)}
                leftIcon='robot-happy-outline'
                rightIcon='chevron-right'
            />
        );
    }

    return (
        <OptionItem
            type={Platform.select({ios: 'arrow', default: 'default'})}
            icon='robot-happy-outline'
            action={onPress}
            label={intl.formatMessage(messages.agents)}
        />
    );
};

export default AgentsOption;
