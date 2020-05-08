// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {handlePostDraftChanged} from '@actions/views/channel';
import {handleCommentDraftChanged} from '@actions/views/thread';
import {userTyping} from '@actions/views/typing';

import PostInput from './post_input';

const mapDispatchToProps = {
    handleCommentDraftChanged,
    handlePostDraftChanged,
    userTyping,
};

export default connect(null, mapDispatchToProps, null, {forwardRef: true})(PostInput);
