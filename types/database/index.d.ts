// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

interface NotifyProps {
    channel: true;
    desktop: string;
    desktop_sound: true;
    email: true;
    first_name: true
    mention_keys: string;
    push: string;
}

 interface UserProps {
    [userPropsName : string] : any
}

 interface Timezone {
    automaticTimezone: string
    manualTimezone: string,
    useAutomaticTimezone: true,
}

