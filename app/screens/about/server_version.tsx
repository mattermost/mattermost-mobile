// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {makeStyleSheetFromTheme} from '@utils/theme';

type ServerVersionProps = {
    config: ClientConfig;
}

const ServerVersion = ({config}: ServerVersionProps) => {
    const buildNumber = config.BuildNumber;
    const version = config.Version;
    const theme = useTheme();
    const style = getStyleSheet(theme);

    let id = t('mobile.about.serverVersion');
    let defaultMessage = 'Server Version: {version} (Build {number})';
    let values: {version: string; number?: string} = {
        version,
        number: buildNumber,
    };

    if (buildNumber === version) {
        id = t('mobile.about.serverVersionNoBuild');
        defaultMessage = 'Server Version: {version}';
        values = {
            version,
            number: undefined,
        };
    }
    return (
        <FormattedText
            id={id}
            defaultMessage={defaultMessage}
            style={style.info}
            values={values}
            testID='about.server_version'
        />
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        info: {
            color: theme.centerChannelColor,
            fontSize: 16,
            lineHeight: 19,
        },
    };
});

export default ServerVersion;
