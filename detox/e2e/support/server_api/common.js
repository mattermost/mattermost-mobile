// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const getResponseFromError = (err) => {
    let data;
    let status;

    const {response} = err;
    if (response) {
        data = response.data;
        status = response.status;
    }

    return {error: data, status};
};
