// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {View} from 'react-native';

import {AppBindingLocations} from '@constants/apps';
import {cleanBinding} from '@utils/apps';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import EmbedText from './embed_text';
import EmbedTitle from './embed_title';
import EmbedSubBindings from './embedded_sub_bindings';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    embed: AppBinding;
    location: AvailableScreens;
    post: PostModel;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderLeftColor: changeOpacity(theme.linkColor, 0.6),
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderBottomWidth: 1,
            borderLeftWidth: 3,
            borderRightWidth: 1,
            borderTopWidth: 1,
            marginTop: 5,
            padding: 12,
        },
    };
});

const EmbeddedBinding = ({embed, location, post, theme}: Props) => {
    const style = getStyleSheet(theme);
    const [cleanedBindings, setCleanedBindings] = useState<AppBinding[]>([]);

    useEffect(() => {
        const copiedBindings: AppBinding = JSON.parse(JSON.stringify(embed));
        const bindings = cleanBinding(copiedBindings, AppBindingLocations.IN_POST)?.bindings;
        setCleanedBindings(bindings!);
    }, [embed]);

    return (
        <>
            <View style={style.container}>
                {embed.label &&
                <EmbedTitle
                    channelId={post.channelId}
                    location={location}
                    theme={theme}
                    value={embed.label}
                />
                }
                {embed.description &&
                <EmbedText
                    channelId={post.channelId}
                    location={location}
                    value={embed.description}
                    theme={theme}
                />
                }
                {Boolean(cleanedBindings?.length) &&
                <EmbedSubBindings
                    bindings={cleanedBindings}
                    post={post}
                    theme={theme}
                    location={location}
                />
                }
            </View>
        </>
    );
};

export default EmbeddedBinding;
