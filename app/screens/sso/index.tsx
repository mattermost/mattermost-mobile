// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
import ViewTypes from '@constants/view';
import emmProvider from '@init/emm_provider';

import {scheduleExpiredNotification} from '@requests/remote/push_notification';

import {resetToChannel} from '@screens/navigation';
import {ErrorApi} from '@typings/api/client4';
import {isMinimumServerVersion} from '@utils/helpers';
import React from 'react';
import {useIntl} from 'react-intl';

import SSOWithRedirectURL from './sso_with_redirect_url';
import SSOWithWebView from './sso_with_webview';

interface SSOProps {
  ssoType: string;
  config: ClientConfig;
  license: ClientLicense;
  theme: Theme;
  serverUrl: string;
}

const SSO = ({config, serverUrl, ssoType, theme}: SSOProps) => {
    console.log('>>>>>>>>>>>>>>> serverUrl', serverUrl);
    const intl = useIntl();

    const [loginError, setLoginError] = React.useState<string>('');

    let completeUrlPath = '';
    let loginUrl = '';
    switch (ssoType) {
        case ViewTypes.GOOGLE: {
            completeUrlPath = '/signup/google/complete';
            loginUrl = `${serverUrl}/oauth/google/mobile_login`;
            break;
        }
        case ViewTypes.GITLAB: {
            completeUrlPath = '/signup/gitlab/complete';
            loginUrl = `${serverUrl}/oauth/gitlab/mobile_login`;
            break;
        }
        case ViewTypes.SAML: {
            completeUrlPath = '/login/sso/saml';
            loginUrl = `${serverUrl}/login/sso/saml?action=mobile`;
            break;
        }
        case ViewTypes.OFFICE365: {
            completeUrlPath = '/signup/office365/complete';
            loginUrl = `${serverUrl}/oauth/office365/mobile_login`;
            break;
        }
        case ViewTypes.OPENID: {
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

    const onMMToken = async (token: string) => {
        Client4.setToken(token);
        asyncDispatch(ssoLogin()).
            then((result: any) => {
                if (result && result.error) {
                    onLoadEndError(result.error);
                    return;
                }
                goToChannel();
            }).
            catch(() => {
                setLoginError('');
            });
    };

    const goToChannel = () => {
        scheduleSessionExpiredNotification();
        resetToChannel();
    };

    const scheduleSessionExpiredNotification = async () => {
        await scheduleExpiredNotification(intl);
    };

    const isSSOWithRedirectURLAvailable = isMinimumServerVersion(config.Version, 5, 33, 0);

    const props = {
        intl,
        loginError,
        loginUrl,
        onCSRFToken: Client4.setCSRF,
        onMMToken,
        setLoginError,
        theme,
    };

    //fixme: where is inAppSessionAuth defined ??
    if (!isSSOWithRedirectURLAvailable || emmProvider.inAppSessionAuth === true) {
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

export default React.memo(SSO);
