// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Portal} from '@gorhom/portal';
import {useEffect, useState} from 'react';
import {FullWindowOverlay} from 'react-native-screens';

import ShareFeedbackStore from '@store/share_feedback_store';

import ShareFeedback from './share_feedback';

export default function ShareFeedbackContainer() {
    const [state, setState] = useState(ShareFeedbackStore.getState());

    // Subscribe to store changes
    useEffect(() => {
        const sub = ShareFeedbackStore.observe().subscribe(setState);
        return () => sub.unsubscribe();
    }, []);

    if (!state.visible) {
        return null;
    }

    return (
        <Portal hostName='share_feedback'>
            <FullWindowOverlay>
                <ShareFeedback onDismiss={ShareFeedbackStore.dismiss}/>
            </FullWindowOverlay>
        </Portal>
    );
}
