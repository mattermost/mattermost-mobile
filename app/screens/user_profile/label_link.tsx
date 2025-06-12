// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, TouchableOpacity} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getScheme, tryOpenURL} from '@utils/url';

type Props = {
    description: string;
    linkType: string;
    testID?: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    link: {
        color: theme.linkColor,
        overflow: 'hidden',
        flex: 2,
        ...typography('Body', 200),
    },
    button: {
        flex: 2,
    },
}));

const UserProfileLink = ({description, linkType, testID}: Props) => {
    const styles = getStyleSheet(useTheme());

    // don't try to be smart, if there is already a scheme, don't add one, otherwise add the most likely one
    let url = description;
    if (!getScheme(description)) {
        url = linkType === 'url' ? `https://${description}` : `tel:${description}`;
    }
    const openURL = useCallback(() => tryOpenURL(url), [url]);

    return (
        <TouchableOpacity
            onPress={openURL}
            style={styles.button}
        >
            <Text
                style={styles.link}
                numberOfLines={1}
                testID={`${testID}.${linkType}`}
            >
                {description}
            </Text>
        </TouchableOpacity>
    );
};

export default UserProfileLink;
