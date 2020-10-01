// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const getResponseFromError = (err) => {
    const {response: {data, status}} = err;

    return {error: data, status};
};
