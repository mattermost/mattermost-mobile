// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PostList from '@components/post_list';
import {CHANNEL} from '@constants/screens';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import React from 'react';
import {Animated, View} from 'react-native';

const ChannelPostList = ({channel, postRecords, currentUserId}) => {
    const bottomPadding: Animated.Value = new Animated.Value(0);
    const theme = useTheme();

    const style = getStyleSheet(theme);

    return (
        <Animated.View
            style={[style.container, {paddingBottom: bottomPadding}]}
        >
            <View style={style.separator}/>
            <PostList
                testID='channel.post_list'
                postIds={postIds}
                extraData={postIds.length !== 0}
                onLoadMoreUp={loadMorePostsTop}

                // onRefresh={actions.setChannelRefreshing}
                indicateNewMessages={true}
                currentUserId={currentUserId}
                lastViewedAt={lastViewedAt} // from myChannel query
                channelId={channelId}

                // renderFooter={renderFooter}
                refreshing={refreshing}
                scrollViewNativeID={channelId}
                loadMorePostsVisible={loadMorePostsVisible}
                showMoreMessagesButton={true}
                location={CHANNEL}
            />
        </Animated.View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flex: 1,
    },
    separator: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
        height: 1,
    },
}));
