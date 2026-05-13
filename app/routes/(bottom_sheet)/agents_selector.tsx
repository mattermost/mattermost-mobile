// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AgentsSelectorScreen, {type Props} from '@agents/screens/agent_selector';
import {usePropsFromParams} from '@hooks/props_from_params';
import CallbackStore from '@store/callback_store';

export default function AgentsSelectorRoute() {
    const props = usePropsFromParams<Omit<Props, 'onSelectAgent'>>();
    const onSelectAgent = CallbackStore.getCallback<Props['onSelectAgent']>();

    return (
        <AgentsSelectorScreen
            {...props}
            onSelectAgent={onSelectAgent}
        />
    );
}
