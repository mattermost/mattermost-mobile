// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const {networkInterfaces} = require('os');

const getLocalIPAddress = () => {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        const netInterface = nets[name];
        if (netInterface) {
            for (const net of netInterface) {
                if (net.family === 'IPv4' && !net.internal) {
                    return net.address;
                }
            }
        }
    }
    return 'localhost';
};

module.exports = {
    getLocalIPAddress,
};
