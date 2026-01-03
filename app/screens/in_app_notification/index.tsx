// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Portal} from '@gorhom/portal';
import {useEffect, useState} from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {FullWindowOverlay} from 'react-native-screens';

import InAppNotificationStore from '@store/in_app_notification_store';

import InAppNotification from './in_app_notification';

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
});

export default function InAppNotificationContainer() {
    const [state, setState] = useState(InAppNotificationStore.getState());

    // Subscribe to store changes
    useEffect(() => {
        const sub = InAppNotificationStore.observe().subscribe(setState);
        return () => sub.unsubscribe();
    }, []);

    if (!state.visible || !state.notification) {
        return null;
    }

    const Container = Platform.OS === 'ios' ? FullWindowOverlay : View;

    return (
        <Portal hostName='notification'>
            <Container
                style={styles.container}
                pointerEvents='box-none'
            >
                <InAppNotification
                    notification={state.notification}
                    serverName={state.serverName}
                    serverUrl={state.serverUrl!}
                    onDismiss={InAppNotificationStore.dismiss}
                />
            </Container>
        </Portal>
    );
}
