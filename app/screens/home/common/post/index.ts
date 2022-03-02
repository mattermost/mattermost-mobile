// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';

import Post from './post';

const enhance = withObservables(['post'], ({post}) => ({
    post,
}));

export default enhance(Post);
