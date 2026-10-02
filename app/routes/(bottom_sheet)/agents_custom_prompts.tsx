// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CustomPromptListScreen, {type Props} from '@agents/screens/custom_prompt_list';
import {usePropsFromParams} from '@hooks/props_from_params';
import CallbackStore from '@store/callback_store';

export default function AgentsCustomPromptsRoute() {
    const props = usePropsFromParams<Omit<Props, 'updateValue'>>();
    const updateValue = CallbackStore.getCallback<Props['updateValue']>();

    return (
        <CustomPromptListScreen
            {...props}
            updateValue={updateValue}
        />
    );
}
