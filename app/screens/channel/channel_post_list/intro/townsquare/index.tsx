// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {Permissions} from '@constants';
import {hasPermission} from '@utils/role';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import TownSquareIllustration from '../illustration/town_square';
import IntroOptions from '../options';

import type RoleModel from '@typings/database/models/servers/role';

type Props = {
    channelId: string;
    displayName: string;
    roles: RoleModel[];
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        marginHorizontal: 20,
    },
    message: {
        color: theme.centerChannelColor,
        marginTop: 16,
        textAlign: 'center',
        ...typography('Body', 200, 'Regular'),
        width: '100%',
    },
    title: {
        color: theme.centerChannelColor,
        marginTop: 16,
        ...typography('Heading', 700, 'SemiBold'),
    },
}));

const TownSquare = ({channelId, displayName, roles, theme}: Props) => {
    const styles = getStyleSheet(theme);
    return (
        <View style={styles.container}>
            <TownSquareIllustration theme={theme}/>
            <Text
                style={styles.title}
                testID='channel_post_list.intro.display_name'
            >
                {displayName}
            </Text>
            <FormattedText
                defaultMessage='Welcome to {name}. Everyone automatically becomes a member of this channel when they join the team.'
                id='intro.townsquare'
                style={styles.message}
                values={{name: displayName}}
            />
            <IntroOptions
                channelId={channelId}
                header={hasPermission(roles, Permissions.MANAGE_PUBLIC_CHANNEL_PROPERTIES)}
                canAddMembers={false}
            />
        </View>
    );
};

export default TownSquare;
