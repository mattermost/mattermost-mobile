// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

interface RudderClient {
    setup(key: string, options: any): Promise<void>;
    track(event: string, properties: Record<string, any> | undefined, options?: Record<string, any>): void;
    identify(userId: string, traits: Record<string, any>, options?: Record<string, any>): Promise<void>;
    screen(name: string, properties: Record<string, any> | undefined, options?: Record<string, any>): void;
    reset(): Promise<void>;
}
