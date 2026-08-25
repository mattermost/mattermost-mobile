// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RewriteOptionsScreen, {type updateValueFn} from '@agents/screens/rewrite_options';
import {usePropsFromParams} from '@hooks/props_from_params';
import CallbackStore from '@store/callback_store';

export default function AgentsRewriteOptionsRoute() {
    const {originalMessage} = usePropsFromParams<{originalMessage: string}>();
    const updateValue = CallbackStore.getCallback<updateValueFn>();

    return (
        <RewriteOptionsScreen
            originalMessage={originalMessage}
            updateValue={updateValue}
        />
    );
}
