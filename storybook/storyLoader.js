// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

function loadStories() {
    require('../app/components/avatars/avatars.stories');
    require('../app/components/loading.stories');
}

const stories = [
    '../app/components/avatars/avatars.stories',
    '../app/components/loading.stories',
];

module.exports = {
    loadStories,
    stories,
};
