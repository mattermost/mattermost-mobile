// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import React, {useState} from 'react';
import {useIntl} from 'react-intl';

import NetworkManager from '@app/init/network_manager';
import {SSO as SSOEnum} from '@constants';
import {scheduleExpiredNotification} from '@requests/remote/push_notification';
import {ssoLogin} from '@requests/remote/user';
import {resetToChannel} from '@screens/navigation';
import {ErrorApi} from '@typings/api/client4';
import {isMinimumServerVersion} from '@utils/helpers';

import SSOWithRedirectURL from './sso_with_redirect_url';
import SSOWithWebView from './sso_with_webview';

interface SSOProps {
  config: Partial<ClientConfig>;
  license: Partial<ClientLicense>;
  serverUrl: string;
  ssoType: string;
  theme: Partial<Theme>;
}

const SSO = ({config, serverUrl, ssoType, theme}: SSOProps) => {
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

    const onCSRFToken = (csrfToken: string) => {
        const client = NetworkManager.clients[serverUrl];
        client.setCSRF(csrfToken);
    }


    // TOOD: So long as the APIClient is configured with `bearerAuthTokenResponseHeader`,
    // then the token will be automatically extracted and set in the headers via a request
    // adapter. Do we need this method? Maybe we can passin ssoLogin as a prop instead of
    // this method?
    const onMMToken = async (token: string) => {
        // Client4.setToken(token);

        const {error = undefined} = await ssoLogin(serverUrl);
        if (error) {
            onLoadEndError(error);
            setLoginError(error);
            return;
        }
        goToChannel();
    };

    const goToChannel = () => {
        scheduleExpiredNotification(serverUrl, intl);
        resetToChannel();
    };

    const isSSOWithRedirectURLAvailable = isMinimumServerVersion(config.Version!, 5, 33, 0);

    const props = {
        loginError,
        loginUrl,
        onCSRFToken,
        onMMToken,
        setLoginError,
        theme,
    };

    if (!isSSOWithRedirectURLAvailable || managedConfig?.inAppSessionAuth === 'true') {
        return (
            <SSOWithWebView
                {...props}
                completeUrlPath={completeUrlPath}
                serverUrl={serverUrl}
                ssoType={ssoType}
            />
        );
    }
    return <SSOWithRedirectURL {...props}/>;
};

export default SSO;
