// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import UserProfileLink from './label_link';

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
    title: {
        color: theme.centerChannelColor,
        flex: 1,
        marginRight: 20,
        height: '100%',
        alignItems: 'flex-start',
        ...typography('Body', 100, 'SemiBold'),
    },
}));

const UserProfileLabel = ({title, description, testID, type = 'text'}: Props) => {
    const styles = getStyleSheet(useTheme());
    let descriptionComponent;
    switch (type) {
        case 'url':
        case 'phone':
            descriptionComponent = (
                <UserProfileLink
                    description={description}
                    linkType={type}
                    testID={testID}
                />
            );
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
