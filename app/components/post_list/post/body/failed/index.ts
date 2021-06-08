// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {createPost, removePost} from '@mm-redux/actions/posts';

import Failed from './failed';

const mapDispatchToProps = {
    createPost,
    removePost,
};

export default connect(undefined, mapDispatchToProps)(Failed);
