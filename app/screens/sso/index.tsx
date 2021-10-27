// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import React, {useState} from 'react';

import {ssoLogin} from '@actions/remote/session';
import ClientError from '@client/rest/error';
import {SSO as SSOEnum} from '@constants';
import {resetToHome} from '@screens/navigation';
import {isMinimumServerVersion} from '@utils/helpers';

import SSOWithRedirectURL from './sso_with_redirect_url';
import SSOWithWebView from './sso_with_webview';

import type {LaunchProps} from '@typings/launch';

interface SSOProps extends LaunchProps {
  config: Partial<ClientConfig>;
  license: Partial<ClientLicense>;
  ssoType: string;
  theme: Partial<Theme>;
}

const SSO = ({config, extra, launchError, launchType, serverUrl, ssoType, theme}: SSOProps) => {
    const managedConfig = useManagedConfig();

    const [loginError, setLoginError] = useState<string>('');
    let completeUrlPath = '';
    let loginUrl = '';
    switch (ssoType) {
        case SSOEnum.GOOGLE: {
            completeUrlPath = '/signup/google/complete';
            loginUrl = `${serverUrl}/oauth/google/mobile_login`;
            break;
        }
        case SSOEnum.GITLAB: {
            completeUrlPath = '/signup/gitlab/complete';
            loginUrl = `${serverUrl}/oauth/gitlab/mobile_login`;
            break;
        }
        case SSOEnum.SAML: {
            completeUrlPath = '/login/sso/saml';
            loginUrl = `${serverUrl}/login/sso/saml?action=mobile`;
            break;
        }
        case SSOEnum.OFFICE365: {
            completeUrlPath = '/signup/office365/complete';
            loginUrl = `${serverUrl}/oauth/office365/mobile_login`;
            break;
        }
        case SSOEnum.OPENID: {
            completeUrlPath = '/signup/openid/complete';
            loginUrl = `${serverUrl}/oauth/openid/mobile_login`;
            break;
        }
        default:
            break;
    }

    const onLoadEndError = (e: ClientErrorProps | Error | string) => {
        console.warn('Failed to set store from local data', e); // eslint-disable-line no-console
        if (typeof e === 'string') {
            setLoginError(e);
            return;
        }

        let errorMessage = e.message;
        if (e instanceof ClientError && e.url) {
            errorMessage += `\nURL: ${e.url}`;
        }
        setLoginError(errorMessage);
    };

    const doSSOLogin = async (bearerToken: string, csrfToken: string) => {
        const result: LoginActionResponse = await ssoLogin(serverUrl!, config.DiagnosticId!, bearerToken, csrfToken);
        if (result?.error && result.failed) {
            onLoadEndError(result.error);
            return;
        }
        if (!result.hasTeams && !result.error) {
            // eslint-disable-next-line no-console
            console.log('GO TO NO TEAMS');
            return;
        }
        goToHome(result.time || 0, result.error as never);
    };

    const goToHome = (time: number, error?: never) => {
        const hasError = launchError || Boolean(error);
        resetToHome({extra, launchError: hasError, launchType, serverUrl, time});
    };

    const isSSOWithRedirectURLAvailable = isMinimumServerVersion(config.Version!, 5, 33, 0);

    const props = {
        doSSOLogin,
        loginError,
        loginUrl,
        setLoginError,
        theme,
    };

    if (!isSSOWithRedirectURLAvailable || managedConfig?.inAppSessionAuth === 'true') {
        return (
            <SSOWithWebView
                {...props}
                completeUrlPath={completeUrlPath}
                serverUrl={serverUrl!}
                ssoType={ssoType}
            />
        );
    }
    return (
        <SSOWithRedirectURL
            {...props}
            serverUrl={serverUrl!}
        />
    );
};

export default SSO;
