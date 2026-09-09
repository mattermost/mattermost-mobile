// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Ephemeral in-memory store for custom prompts (D14): prompts are cheap to
// refetch, bot-independent, and only needed while a consumption surface is
// open, so they don't warrant WatermelonDB persistence. Mirrors the webapp
// plugin's redux slice ownership (fetch action writes, components subscribe).

import {BehaviorSubject} from 'rxjs';

import type {CustomPrompt} from '@agents/types/api';

class CustomPromptsStore {
    private promptsSubjects: Map<string, BehaviorSubject<CustomPrompt[]>> = new Map();
    private pinnedIdsSubjects: Map<string, BehaviorSubject<string[]>> = new Map();

    private getPromptsSubject(serverUrl: string): BehaviorSubject<CustomPrompt[]> {
        let subject = this.promptsSubjects.get(serverUrl);
        if (!subject) {
            subject = new BehaviorSubject<CustomPrompt[]>([]);
            this.promptsSubjects.set(serverUrl, subject);
        }
        return subject;
    }

    private getPinnedIdsSubject(serverUrl: string): BehaviorSubject<string[]> {
        let subject = this.pinnedIdsSubjects.get(serverUrl);
        if (!subject) {
            subject = new BehaviorSubject<string[]>([]);
            this.pinnedIdsSubjects.set(serverUrl, subject);
        }
        return subject;
    }

    observePrompts(serverUrl: string) {
        return this.getPromptsSubject(serverUrl).asObservable();
    }

    setPrompts(serverUrl: string, prompts: CustomPrompt[]) {
        this.getPromptsSubject(serverUrl).next(prompts);
    }

    getPrompts(serverUrl: string): CustomPrompt[] {
        return this.getPromptsSubject(serverUrl).getValue();
    }

    observePinnedIds(serverUrl: string) {
        return this.getPinnedIdsSubject(serverUrl).asObservable();
    }

    setPinnedIds(serverUrl: string, pinnedIds: string[]) {
        this.getPinnedIdsSubject(serverUrl).next(pinnedIds);
    }

    getPinnedIds(serverUrl: string): string[] {
        return this.getPinnedIdsSubject(serverUrl).getValue();
    }

    /** Drop a server's cached prompts and pins (per-server logout). */
    removeServer(serverUrl: string) {
        this.promptsSubjects.get(serverUrl)?.complete();
        this.promptsSubjects.delete(serverUrl);
        this.pinnedIdsSubjects.get(serverUrl)?.complete();
        this.pinnedIdsSubjects.delete(serverUrl);
    }
}

const customPromptsStore = new CustomPromptsStore();

export default customPromptsStore;
