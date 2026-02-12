// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useMemo} from 'react';

// See LICENSE.txt for license information.
function useInitialValue<T>(factory: () => T) {
    // We only want the initial value, no updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo<T>(factory, []);
}

export default useInitialValue;
