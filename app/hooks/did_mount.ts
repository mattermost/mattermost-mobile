// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, type EffectCallback} from 'react';

function useDidMount(callback: EffectCallback) {
    // We only want to run this effect on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(callback, []);
}

export default useDidMount;
