// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getScheme, tryOpenURL} from '@utils/url';

type Props = {
    title: string;
    description: string;
    testID?: string;
    type?: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        marginVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    description: {
        color: theme.centerChannelColor,
        flex: 2,
        ...typography('Body', 200),
    },
    link: {
        color: theme.linkColor,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    title: {
        color: theme.centerChannelColor,
        flex: 1,
        marginRight: 20,
        height: '100%',
        alignItems: 'flex-start',
        ...typography('Body', 100, 'SemiBold'),
    },
}));

const drawLink = (description: string, linkType: string, style: any, testID?: string) => {

    // don't try to be smart, if there is already a scheme, don't add one, otherwise add the most likely one
    let url = description;
    if (!getScheme(description)) {
        url = linkType === 'url' ? `https://${description}` : `tel:${description}`;
    }

    return (
        <TouchableOpacity
            onPress={() => tryOpenURL(url)}
            style={{
                flex: 2,
            }}
        >
            <Text
                style={style}
                testID={`${testID}.${linkType}`}
            >
                {description}
            </Text>
        </TouchableOpacity>
    );
};

const UserProfileLabel = ({title, description, testID, type = 'text'}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    let descriptionComponent;
    switch (type) {
        case 'url':
        case 'phone':
            descriptionComponent = drawLink(description, type, [styles.description, styles.link], testID);
            break;
        case 'select':
        case 'multiselect':
            descriptionComponent = (
                <Text
                    style={styles.description}
                    testID={`${testID}.select`}
                >
                    {description}
                </Text>
            );
            break;
        case 'text':
        default:
            descriptionComponent = (
                <Text
                    style={styles.description}
                    testID={`${testID}.text`}
                >
                    {description}
                </Text>
            );
            break;
    }

    return (
        <View style={styles.container}>
            <Text
                style={styles.title}
                testID={`${testID}.title`}
                numberOfLines={1}
            >
                {title}
            </Text>
            {descriptionComponent}
        </View>
    );
};

export default UserProfileLabel;
