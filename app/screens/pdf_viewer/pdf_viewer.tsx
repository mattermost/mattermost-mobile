// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    SecurePdfViewer,
    type OnLinkPressedEvent,
    type OnLoadErrorEvent,
    type OnPasswordFailedEvent,
    type OnPasswordLimitReachedEvent,
    type OnPasswordRequiredEvent,
} from '@mattermost/secure-pdf-viewer';
import {deleteAsync} from 'expo-file-system';
import {useNavigation} from 'expo-router';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, View} from 'react-native';

import {setFileAsBlocked} from '@actions/local/file';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {logError} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {openLink} from '@utils/url/links';

import PdfLoadError from './error';
import PdfPassword, {type PasswordRef} from './password';

type Props = {
    allowPdfLinkNavigation: boolean;
    fileId: string;
    filePath: string;
    siteURL: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    flex: {
        flex: 1,
    },
    pdfView: {
        flex: 1,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
    },
}));

const PdfViewer = ({allowPdfLinkNavigation, fileId, filePath, siteURL}: Props) => {
    const navigation = useNavigation();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const [password, setPassword] = useState<string | undefined>(undefined);
    const passwordRef = useRef<PasswordRef>(null);
    const [maxAttempts, setMaxAttempts] = useState<number | undefined>(undefined);
    const [remainingAttempts, setRemainingAttempts] = useState<number | undefined>(undefined);
    const [navBarVisible, setNavBarVisible] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
    const [promptForPassword, setPromptForPassword] = useState(false);

    const toggleNavbar = useCallback((visible: boolean) => {
        navigation.setOptions({
            headerShown: visible,
        });
    }, [navigation]);

    const onClose = useCallback(() => {
        const onDismiss = CallbackStore.getCallback<() => void>();
        onDismiss?.();
        CallbackStore.removeCallback();
        return navigateBack();
    }, []);

    const onLinkPressed = useCallback((event: OnLinkPressedEvent) => {
        openLink(event.nativeEvent.url, serverUrl, siteURL, intl);
    }, [intl, serverUrl, siteURL]);

    const onLinkPressedDisabled = useCallback(() => {
        logError('Error opening link');
        Alert.alert(
            intl.formatMessage({id: 'mobile.pdf_viewer.link_disabled_title', defaultMessage: 'Link Disabled'}),
            intl.formatMessage({id: 'mobile.pdf_viewer.link_disabled_detail', defaultMessage: "Opening links inside this PDF is not allowed by your organization's security settings."}),
        );
    }, [intl]);

    const onLoad = useCallback(() => {
        setMaxAttempts(undefined);
        setRemainingAttempts(undefined);
    }, []);

    const onLoadError = useCallback((event: OnLoadErrorEvent) => {
        logError('Error loading PDF', event.nativeEvent.message);
        setErrorMessage(event.nativeEvent.message);
        deleteAsync(filePath, {idempotent: true});
    }, [filePath]);

    const onPasswordFailed = useCallback((event: OnPasswordFailedEvent) => {
        setRemainingAttempts(event.nativeEvent.remainingAttempts);
        setPassword(undefined);
        passwordRef.current?.clear();
    }, []);

    const onPasswordFailureLimitReached = useCallback((event: OnPasswordLimitReachedEvent) => {
        passwordRef.current?.clear();
        setMaxAttempts(event.nativeEvent.maxAttempts);
        setRemainingAttempts(0);
        setFileAsBlocked(serverUrl, fileId);
    }, [serverUrl, fileId]);

    const onPasswordRequired = useCallback((event: OnPasswordRequiredEvent) => {
        setMaxAttempts(event.nativeEvent.maxAttempts);
        setRemainingAttempts(event.nativeEvent.remainingAttempts);
    }, []);

    const onTap = useCallback(() => {
        setNavBarVisible((prev) => !prev);
    }, []);

    useEffect(() => {
        toggleNavbar(navBarVisible);
    }, [navBarVisible, toggleNavbar]);

    useAndroidHardwareBackHandler(Screens.PDF_VIEWER, onClose);

    useEffect(() => setPromptForPassword(maxAttempts !== undefined && maxAttempts > 0), [maxAttempts]);

    return (
        <View style={styles.flex}>
            {Boolean(errorMessage) && <PdfLoadError message={errorMessage}/>}
            {promptForPassword &&
                <PdfPassword
                    maxAttempts={maxAttempts}
                    ref={passwordRef}
                    remainingAttempts={remainingAttempts}
                    setPassword={setPassword}
                />
            }
            <SecurePdfViewer
                allowLinks={allowPdfLinkNavigation}
                onLinkPressed={onLinkPressed}
                onLinkPressedDisabled={onLinkPressedDisabled}
                onLoad={onLoad}
                onLoadError={onLoadError}
                onPasswordFailed={onPasswordFailed}
                onPasswordFailureLimitReached={onPasswordFailureLimitReached}
                onPasswordRequired={onPasswordRequired}
                onTap={onTap}
                password={password}
                source={filePath}
                style={styles.pdfView}
            />
        </View>
    );
};

export default PdfViewer;
