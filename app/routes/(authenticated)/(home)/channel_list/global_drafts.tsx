// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {usePropsFromParams} from '@hooks/props_from_params';
import GlobalDraftScreen, {type GlobalDraftProps} from '@screens/global_drafts';

export default function GlobalDraftRoute() {
    const props = usePropsFromParams<GlobalDraftProps>();

    return (<GlobalDraftScreen {...props}/>);
}
