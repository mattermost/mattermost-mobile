// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AgentScreens from '@agents/constants/screens';

import {goToScreen} from '@screens/navigation';

import type {IntlShape} from 'react-intl';

const hideTopBarOptions = {
    topBar: {
        visible: false,
        height: 0,
    },
};

export function goToAgentChat(intl: IntlShape) {
    const title = intl.formatMessage({id: 'agents.chat.title', defaultMessage: 'Agents'});
    goToScreen(AgentScreens.AGENT_CHAT, title, {}, hideTopBarOptions);
}

export function goToAgentThreadsList(intl: IntlShape) {
    const title = intl.formatMessage({id: 'agents.threads_list.title', defaultMessage: 'Agent chat history'});
    goToScreen(AgentScreens.AGENT_THREADS_LIST, title, {}, hideTopBarOptions);
}
