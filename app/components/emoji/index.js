// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getCustomEmojisByName} from 'mattermost-redux/selectors/entities/emojis';

import Emoji from './emoji';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        customEmojis: getCustomEmojisByName(state),
        token: state.entities.general.credentials.token
    };
}

export default connect(mapStateToProps)(Emoji);
