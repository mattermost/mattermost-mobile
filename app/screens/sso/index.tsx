// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import React, {useState} from 'react';
import {useIntl} from 'react-intl';

import {SSO as SSOEnum} from '@constants';
import {scheduleExpiredNotification} from '@actions/remote/push_notification';
import {ssoLogin} from '@actions/remote/user';
import {resetToChannel} from '@screens/navigation';
import {ErrorApi} from '@typings/api/client';
import {isMinimumServerVersion} from '@utils/helpers';

import type {LaunchProps} from '@typings/launch';

import SSOWithRedirectURL from './sso_with_redirect_url';
import SSOWithWebView from './sso_with_webview';

interface SSOProps extends LaunchProps {
  config: Partial<ClientConfig>;
  license: Partial<ClientLicense>;
  ssoType: string;
  theme: Partial<Theme>;
}

const SSO = ({config, extra, launchError, launchType, serverUrl, ssoType, theme}: SSOProps) => {
    const intl = useIntl();
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

    const onLoadEndError = (e: ErrorApi) => {
        console.warn('Failed to set store from local data', e); // eslint-disable-line no-console
        let errorMessage = e.message;
        if (e.url) {
            errorMessage += `\nURL: ${e.url}`;
        }
        setLoginError(errorMessage);
    };

    const doSSOLogin = async (bearerToken: string, csrfToken: string) => {
        const {error = undefined} = await ssoLogin(serverUrl!, bearerToken, csrfToken);
        if (error) {
            onLoadEndError(error);
            setLoginError(error);
            return;
        }
        goToChannel();
    };

    const goToChannel = () => {
        scheduleExpiredNotification(serverUrl!, intl);
        resetToChannel({extra, launchError, launchType, serverUrl});
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
