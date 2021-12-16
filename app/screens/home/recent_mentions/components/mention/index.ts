// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';

import Mention from './mention';

const enhance = withObservables(['post'], ({post}) => ({
    post,
}));

export default enhance(Mention);
