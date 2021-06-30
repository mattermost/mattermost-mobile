// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';

export const createChannels = async () => {
    const activeServerUrl = await DatabaseManager.getActiveServerUrl();

    if (!activeServerUrl) {
        console.error('In Mock, unable to createChannels as there is no activeServerUrl set');
    }

    const operator = DatabaseManager.serverDatabases[activeServerUrl!].operator;

    console.log('>>> CREATING CHANNELS');

    await operator.handleChannel({
        channels: [
            {
                id: '7hob1ggoypydubgje3y9fc15sr',
                create_at: 1619538066355,
                update_at: 1619538066355,
                delete_at: 0,
                team_id: '',
                type: 'G',
                display_name: 'A, E, M',
                name: '6e17d4ab762b910531f3cd710dd4d3b24d506a2f',
                header: '',
                purpose: '',
                last_post_at: 1625058978458,
                total_msg_count: 187,
                extra_update_at: 0,
                creator_id: '',
                scheme_id: null,
                props: null,
                group_constrained: null,
                shared: null,
                total_msg_count_root: 67,
                policy_id: null,
            },
            {
                id: 'xgeikjf383ftmx8jzrhdocmfne',
                create_at: 1445641095585,
                update_at: 1585587904510,
                delete_at: 0,
                team_id: 'rcgiyftm7jyrxnma1osd8zswby',
                type: 'O',
                display_name: 'Developers',
                name: 'developers',
                header: '[Code of Conduct](https://community-daily.mattermost.com/core/pl/4k6zhws8c3dyxeee8whhawobte) | [Documentation](https://developers.mattermost.com/) | [Blog](https://developers.mattermost.com/blog) | [GO Tutorial](https://tour.golang.org/welcome/1) | [Effective GO](https://golang.org/doc/effective_go.html) | [React](https://facebook.github.io/react/) | [React Components](https://reactjs.org/docs/react-component.html) | [React-Bootstrap](https://react-bootstrap.github.io/)',
                purpose: 'Discuss developer issues with community and Mattermost Inc.',
                last_post_at: 1625051877789,
                total_msg_count: 33790,
                extra_update_at: 1526275951074,
                creator_id: 'yxz1531yctf7fxeujwxhged4we',
                scheme_id: null,
                props: null,
                group_constrained: false,
                shared: null,
                total_msg_count_root: 13531,
                policy_id: null,
            },
            {
                id: '9pm1nr6j7fgabc7ium3oixfroa',
                create_at: 1617210567354,
                update_at: 1617210567354,
                delete_at: 0,
                team_id: 'rcgiyftm7jyrxnma1osd8zswby',
                type: 'O',
                display_name: 'Mobile App Reviews',
                name: 'mobile-app-reviews',
                header: '',
                purpose: '',
                last_post_at: 1624985441111,
                total_msg_count: 83,
                extra_update_at: 0,
                creator_id: 'o1nq6cmn5pfo8k8tchb4gtx4kc',
                scheme_id: '',
                props: null,
                group_constrained: false,
                shared: null,
                total_msg_count_root: 78,
                policy_id: null,
            },
        ],
        prepareRecordsOnly: false,
    });
};

// need to add currentUserId
