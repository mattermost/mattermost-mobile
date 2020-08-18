// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {favoriteChannel, unfavoriteChannel} from '@mm-redux/actions/channels';
import {getFavoritesPreferences} from '@mm-redux/selectors/entities/preferences';

import Favorite from './favorite';

function mapStateToProps(state, ownProps) {
    const {channelId} = ownProps;
    const favoriteChannels = getFavoritesPreferences(state) || [];

    return {
        channelId,
        isFavorite: favoriteChannels.indexOf(channelId) > -1,
    };
}

const mapDispatchToProps = {
    favoriteChannel,
    unfavoriteChannel,
};

export default connect(mapStateToProps, mapDispatchToProps)(Favorite);
