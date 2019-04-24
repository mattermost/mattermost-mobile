// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {makeGenerateCombinedPost} from 'mattermost-redux/utils/post_list';

import Post from 'app/components/post';

export function makeMapStateToProps() {
    const generateCombinedPost = makeGenerateCombinedPost();

    return (state, ownProps) => {
        return {
            post: generateCombinedPost(state, ownProps.combinedId),
            postId: ownProps.combinedId,
        };
    };
}

// Note that this also passes through Post's mapStateToProps
export default connect(makeMapStateToProps)(Post);
