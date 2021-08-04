// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type SystemModel from '@typings/database/models/servers/system';

type ServerVersionProps = {
    config: SystemModel;
}

const ServerVersion = ({config}: ServerVersionProps) => {
    const buildNumber = config.value.BuildNumber;
    const version = config.value.Version;
    const theme = useTheme();
    const style = getStyleSheet(theme);

    if (buildNumber === version) {
        return (
            <FormattedText
                id='mobile.about.serverVersionNoBuild'
                defaultMessage='Server Version: {version}'
                style={style.info}
                values={{
                    version,
                }}
                testID='about.server_version'
            />
        );
    }
    return (
        <FormattedText
            id='mobile.about.serverVersion'
            defaultMessage='Server Version: {version} (Build {number})'
            style={style.info}
            values={{
                version,
                number: buildNumber,
            }}
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
