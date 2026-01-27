// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject} from 'rxjs';

import type {Agent} from '@agents/types';

/**
 * Rewrite processing state
 */
export interface RewriteState {
    isProcessing: boolean;
    serverUrl: string;
}

/**
 * Store for managing rewrite-related ephemeral state
 */
class RewriteStore {
    private agentsSubjects: Map<string, BehaviorSubject<Agent[]>> = new Map();
    private rewriteState = new BehaviorSubject<RewriteState>({isProcessing: false, serverUrl: ''});

    /**
     * Get or create a BehaviorSubject for agents per server
     */
    private getAgentsSubject(serverUrl: string): BehaviorSubject<Agent[]> {
        let subject = this.agentsSubjects.get(serverUrl);
        if (!subject) {
            subject = new BehaviorSubject<Agent[]>([]);
            this.agentsSubjects.set(serverUrl, subject);
        }
        return subject;
    }

    // =========================================================================
    // Agents Management
    // =========================================================================

    /**
     * Observe agents for a server (reactive)
     */
    observeAgents(serverUrl: string) {
        return this.getAgentsSubject(serverUrl).asObservable();
    }

    /**
     * Set agents for a server
     */
    setAgents(serverUrl: string, agents: Agent[]) {
        this.getAgentsSubject(serverUrl).next(agents);
    }

    /**
     * Get current agents for a server (synchronous)
     */
    getAgents(serverUrl: string): Agent[] {
        return this.getAgentsSubject(serverUrl).getValue();
    }

    // =========================================================================
    // Rewrite Processing State
    // =========================================================================

    /**
     * Observe rewrite processing state (reactive)
     */
    observeRewriteState() {
        return this.rewriteState.asObservable();
    }

    /**
     * Set rewrite processing state
     */
    setRewriteProcessing(isProcessing: boolean, serverUrl: string) {
        this.rewriteState.next({isProcessing, serverUrl});
    }

    /**
     * Get current rewrite state (synchronous)
     */
    getRewriteState(): RewriteState {
        return this.rewriteState.getValue();
    }

    /**
     * Check if currently processing a rewrite
     */
    isRewriteProcessing(): boolean {
        return this.rewriteState.getValue().isProcessing;
    }

    // =========================================================================
    // Cleanup
    // =========================================================================

    /**
     * Clear agents for a specific server
     */
    clearAgents(serverUrl: string) {
        const subject = this.agentsSubjects.get(serverUrl);
        if (subject) {
            subject.next([]);
        }
    }

    /**
     * Clear all state (e.g., on logout)
     */
    clear() {
        for (const subject of this.agentsSubjects.values()) {
            subject.next([]);
            subject.complete();
        }
        this.agentsSubjects.clear();
        this.rewriteState.next({isProcessing: false, serverUrl: ''});
    }
}

// Singleton instance
const rewriteStore = new RewriteStore();

export default rewriteStore;
