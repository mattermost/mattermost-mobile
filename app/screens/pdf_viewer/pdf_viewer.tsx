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
import {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';

import {setFileAsBlocked} from '@actions/local/file';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {dismissModal} from '@screens/navigation';
import {logError} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {openLink} from '@utils/url/links';

import PdfLoadError from './error';
import PdfPassword, {type PasswordRef} from './password';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    allowPdfLinkNavigation: boolean;
    componentId: AvailableScreens;
    closeButtonId: string;
    fileId: string;
    filePath: string;
    onDismiss?: () => void;
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

const PdfViewer = ({allowPdfLinkNavigation, closeButtonId, componentId, fileId, filePath, onDismiss, siteURL}: Props) => {
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

    const toggleNavbar = useCallback((visible: boolean) => {
        Navigation.mergeOptions(componentId, {
            topBar: {
                visible,
                animate: true,
            }});
    }, [componentId]);

    const onClose = useCallback(() => {
        onDismiss?.();
        return dismissModal({componentId});
    }, [componentId, onDismiss]);

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

    useNavButtonPressed(closeButtonId, componentId, onClose, [onClose]);
    useAndroidHardwareBackHandler(componentId, onClose);

    const promptForPassword = (maxAttempts !== undefined && maxAttempts > 0);

    return (
        <SafeAreaView
            nativeID={SecurityManager.getShieldScreenId(componentId)}
            style={styles.flex}
        >
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
        </SafeAreaView>
    );
};

export default PdfViewer;
