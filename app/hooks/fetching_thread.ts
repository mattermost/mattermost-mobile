// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {subject} from '@store/fetching_thread_store';

export const useFetchingThreadState = (rootId: string) => {
    const [isFetching, setIsFetching] = useState(false);
    useEffect(() => {
        const sub = subject.pipe(
            switchMap((s) => of$(s[rootId] || false)),
            distinctUntilChanged(),
        ).subscribe(setIsFetching);

        return () => sub.unsubscribe();
    }, []);

    return isFetching;
};
