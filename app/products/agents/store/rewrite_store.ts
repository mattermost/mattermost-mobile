// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject} from 'rxjs';

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
    private rewriteState = new BehaviorSubject<RewriteState>({isProcessing: false, serverUrl: ''});

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
}

// Singleton instance
const rewriteStore = new RewriteStore();

export default rewriteStore;
