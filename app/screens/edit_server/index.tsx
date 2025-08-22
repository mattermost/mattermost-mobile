// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {SafeAreaView} from 'react-native-safe-area-context';

import DatabaseManager from '@database/manager';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {getServerByDisplayName} from '@queries/app/servers';
import Background from '@screens/background';
import {dismissModal} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Form from './form';
import Header from './header';

import type ServersModel from '@typings/database/models/app/servers';
import type {AvailableScreens} from '@typings/screens/navigation';

interface ServerProps {
    closeButtonId?: string;
    componentId: AvailableScreens;
    server: ServersModel;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    appInfo: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
    flex: {
        flex: 1,
    },
    scrollContainer: {
        alignItems: 'center',
        height: '100%',
        justifyContent: 'center',
    },
}));

const EditServer = ({closeButtonId, componentId, server, theme}: ServerProps) => {
    const {formatMessage} = useIntl();
    const keyboardAwareRef = useRef<KeyboardAwareScrollView>(null);
    const [saving, setSaving] = useState(false);
    const [displayName, setDisplayName] = useState<string>(server.displayName);
    const [buttonDisabled, setButtonDisabled] = useState(true);
    const [displayNameError, setDisplayNameError] = useState<string | undefined>();
    const styles = getStyleSheet(theme);

    const close = useCallback(() => {
        dismissModal({componentId});
    }, [componentId]);

    useEffect(() => {
        setButtonDisabled(Boolean(!displayName || displayName === server.displayName));
    }, [displayName]);

    const handleUpdate = useCallback(async () => {
        if (buttonDisabled) {
            return;
        }

        if (displayNameError) {
            setDisplayNameError(undefined);
        }

        setSaving(true);
        const knownServer = await getServerByDisplayName(displayName);
        if (knownServer && knownServer.lastActiveAt > 0 && knownServer.url !== server.url) {
            setButtonDisabled(true);
            setDisplayNameError(formatMessage({
                id: 'mobile.server_name.exists',
                defaultMessage: 'You are using this name for another server.',
            }));
            setSaving(false);
            return;
        }

        await DatabaseManager.updateServerDisplayName(server.url, displayName);
        dismissModal({componentId});
    }, [!buttonDisabled && displayName, !buttonDisabled && displayNameError]);

    const handleDisplayNameTextChanged = useCallback((text: string) => {
        setDisplayName(text);
        setDisplayNameError(undefined);
    }, []);

    useNavButtonPressed(closeButtonId || '', componentId, close, []);
    useAndroidHardwareBackHandler(componentId, close);

    return (
        <View
            style={styles.flex}
            nativeID={SecurityManager.getShieldScreenId(componentId)}
        >
            <Background theme={theme}/>
            <SafeAreaView
                key={'server_content'}
                style={styles.flex}
                testID='edit_server.screen'
            >
                <KeyboardAwareScrollView
                    bounces={false}
                    contentContainerStyle={styles.scrollContainer}
                    enableAutomaticScroll={Platform.OS === 'android'}
                    enableOnAndroid={false}
                    enableResetScrollToCoords={true}
                    extraScrollHeight={20}
                    keyboardDismissMode='on-drag'
                    keyboardShouldPersistTaps='handled'
                    ref={keyboardAwareRef}
                    scrollToOverflowEnabled={true}
                    style={styles.flex}
                >
                    <Header theme={theme}/>
                    <Form
                        buttonDisabled={buttonDisabled}
                        connecting={saving}
                        displayName={displayName}
                        displayNameError={displayNameError}
                        handleUpdate={handleUpdate}
                        handleDisplayNameTextChanged={handleDisplayNameTextChanged}
                        keyboardAwareRef={keyboardAwareRef}
                        serverUrl={server.url}
                        theme={theme}
                    />
                </KeyboardAwareScrollView>
            </SafeAreaView>
        </View>
    );
};

export default EditServer;
