// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';

import CategoryHeader from './header';

import type CategoryModel from '@typings/database/models/servers/category';

const withCategory = withObservables(['category'], ({category}: {category: CategoryModel}) => ({
    category,
    hasChannels: category.hasChannels,
}));

export default withCategory(CategoryHeader);
