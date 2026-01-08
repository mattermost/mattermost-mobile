// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Portal} from '@gorhom/portal';
import {useEffect, useState} from 'react';
import {FullWindowOverlay} from 'react-native-screens';

import ReviewAppStore from '@store/review_app_store';

import ReviewApp from './review_app';

export default function ReviewAppContainer() {
    const [state, setState] = useState(ReviewAppStore.getState());

    // Subscribe to store changes
    useEffect(() => {
        const sub = ReviewAppStore.observe().subscribe(setState);
        return () => sub.unsubscribe();
    }, []);

    if (!state.visible) {
        return null;
    }

    return (
        <Portal hostName='review_app'>
            <FullWindowOverlay>
                <ReviewApp
                    hasAskedBefore={state.hasAskedBefore}
                    onDismiss={ReviewAppStore.dismiss}
                />
            </FullWindowOverlay>
        </Portal>
    );
}
