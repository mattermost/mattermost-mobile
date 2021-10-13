// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable */

/*! based on simple-peer. MIT License. Feross Aboukhadijeh
 * <https://feross.org/opensource> */

import {Buffer} from 'buffer';
import errCode from 'err-code';
import stream from 'readable-stream';

import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
} from 'react-native-webrtc2';

const queueMicrotask = (callback) => {
    Promise.resolve().then(callback).catch(e => setTiemout(() => { throw e; }))
}

function generateId() {
    // Implementation taken from http://stackoverflow.com/a/2117523
    let id = 'xxxxxxxxxxxxxxxxxxxx';

    id = id.replace(/[xy]/g, (c) => {
        const r = Math.floor(Math.random() * 16);

        let v;
        if (c === 'x') {
            v = r;
        } else {
            v = (r & 0x3) | 0x8;
        }

        return v.toString(16);
    });

    return id;
}

const MAX_BUFFERED_AMOUNT = 64 * 1024;
const ICECOMPLETE_TIMEOUT = 5 * 1000;
const CHANNEL_CLOSING_TIMEOUT = 5 * 1000;

function warn(message) {
    console.warn(message);
}

/**
 * WebRTC peer connection. Same API as node core `net.Socket`, plus a few extra methods.
 * Duplex stream.
 * @param {Object} opts
 */
export default class Peer extends stream.Duplex {
    constructor(localStream) {
        super({allowHalfOpen: false});

        this._id = generateId().slice(0, 7);
        this.channelName = generateId();

        this.channelConfig = Peer.channelConfig;
        this.channelNegotiated = this.channelConfig.negotiated;
        this.streams = [localStream];

        this.destroyed = false;
        this.destroying = false;
        this._connected = false;

        this.remoteAddress = undefined;
        this.remoteFamily = undefined;
        this.remotePort = undefined;
        this.localAddress = undefined;
        this.localFamily = undefined;
        this.localPort = undefined;

        this.pcReady = false;
        this.channelReady = false;
        this.iceComplete = false; // ice candidate trickle done (got null candidate)
        this.iceCompleteTimer = null; // send an offer/answer anyway after some timeout
        this.channel = null;
        this.pendingCandidates = [];

        this.isNegotiating = false; // is this peer waiting for negotiation to complete?
        this.firstNegotiation = true;
        this.batchedNegotiation = false; // batch synchronous negotiations
        this.queuedNegotiation = false; // is there a queued negotiation request?
        this.sendersAwaitingStable = [];
        this.senderMap = new Map();
        this.closingInterval = null;

        this.remoteTracks = [];
        this.remoteStreams = [];

        this.chunk = null;
        this.cb = null;
        this.interval = null;

        try {
            this.pc = new RTCPeerConnection(Peer.config);
        } catch (err) {
            this.destroy(errCode(err, 'ERR_PC_CONSTRUCTOR'));
            return;
        }

        // We prefer feature detection whenever possible, but sometimes that's not
        // possible for certain implementations.
        this._isReactNativeWebrtc =
            typeof this.pc._peerConnectionId === 'number';

        this.pc.oniceconnectionstatechange = () => {
            this._onIceStateChange();
        };
        this.pc.onicegatheringstatechange = () => {
            this._onIceStateChange();
        };
        this.pc.onconnectionstatechange = () => {
            this._onConnectionStateChange();
        };
        this.pc.onsignalingstatechange = () => {
            this._onSignalingStateChange();
        };
        this.pc.onicecandidate = (event) => {
            this._onIceCandidate(event);
        };

        // HACK: Fix for odd Firefox behavior, see: https://github.com/feross/simple-peer/pull/783
        if (typeof this.pc.peerIdentity === 'object') {
            this.pc.peerIdentity.catch((err) => {
                this.destroy(errCode(err, 'ERR_PC_PEER_IDENTITY'));
            });
        }

        // Other spec events, unused by this implementation:
        // - onconnectionstatechange
        // - onicecandidateerror
        // - onfingerprintfailure
        // - onnegotiationneeded

        this._setupData({
            channel: this.pc.createDataChannel(
                this.channelName,
                this.channelConfig,
            ),
        });

        if (this.streams) {
            this.streams.forEach((stream) => {
                this.addStream(stream);
            });
        }
        this.pc.ontrack = () => {};

        this.pc.onaddstream = (event) => {
            this._onStream(event);
        };

        this._needsNegotiation();

        this._onFinishBound = () => {
            this._onFinish();
        };
        this.once('finish', this._onFinishBound);
    }

    get bufferSize() {
        return (this.channel && this.channel.bufferedAmount) || 0;
    }

    // HACK: it's possible channel.readyState is "closing" before peer.destroy() fires
    // https://bugs.chromium.org/p/chromium/issues/detail?id=882743
    get connected() {
        return this._connected && this.channel.readyState === 'open';
    }

    addres() {
        return {
            port: this.localPort,
            family: this.localFamily,
            address: this.localAddress,
        };
    }

    signal(data) {
        if (this.destroying) {
            return;
        }
        if (this.destroyed) {
            throw errCode(
                new Error('cannot signal after peer is destroyed'),
                'ERR_DESTROYED',
            );
        }
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (err) {
                data = {};
            }
        }

        if (data.renegotiate) {
            this._needsNegotiation();
        }
        if (data.transceiverRequest) {
            this.addTransceiver(
                data.transceiverRequest.kind,
                data.transceiverRequest.init,
            );
        }
        if (data.candidate) {
            if (this.pc.remoteDescription && this.pc.remoteDescription.type) {
                this._addIceCandidate(data.candidate);
            } else {
                this.pendingCandidates.push(data.candidate);
            }
        }
        if (data.sdp) {
            this.pc.
                setRemoteDescription(
                    new RTCSessionDescription(data),
                ).
                then(() => {
                    if (this.destroyed) {
                        return;
                    }

                    this.pendingCandidates.forEach((candidate) => {
                        this._addIceCandidate(candidate);
                    });
                    this.pendingCandidates = [];

                    if (this.pc.remoteDescription.type === 'offer') {
                        this._createAnswer();
                    }
                }).
                catch((err) => {
                    this.destroy(errCode(err, 'ERR_SET_REMOTE_DESCRIPTION'));
                });
        }
        if (
            !data.sdp &&
            !data.candidate &&
            !data.renegotiate &&
            !data.transceiverRequest
        ) {
            this.destroy(
                errCode(
                    new Error('signal() called with invalid signal data'),
                    'ERR_SIGNALING',
                ),
            );
        }
    }

    _addIceCandidate(candidate) {
        const iceCandidateObj = new RTCIceCandidate(candidate);
        this.pc.addIceCandidate(iceCandidateObj).catch((err) => {
            if (
                !iceCandidateObj.address ||
                iceCandidateObj.address.endsWith('.local')
            ) {
                warn('Ignoring unsupported ICE candidate.');
            } else {
                this.destroy(errCode(err, 'ERR_ADD_ICE_CANDIDATE'));
            }
        });
    }

    /**
     * Send text/binary data to the remote peer.
     * @param {ArrayBufferView|ArrayBuffer|Buffer|string|Blob} chunk
     */
    send(chunk) {
        if (this.destroying) {
            return;
        }
        if (this.destroyed) {
            throw errCode(
                new Error('cannot send after peer is destroyed'),
                'ERR_DESTROYED',
            );
        }
        this.channel.send(chunk);
    }

    /**
     * Add a Transceiver to the connection.
     * @param {String} kind
     * @param {Object} init
     */
    addTransceiver(kind, init) {
        if (this.destroying) {
            return;
        }
        if (this.destroyed) {
            throw errCode(
                new Error('cannot addTransceiver after peer is destroyed'),
                'ERR_DESTROYED',
            );
        }

        try {
            this.pc.addTransceiver(kind, init);
            this._needsNegotiation();
        } catch (err) {
            this.destroy(errCode(err, 'ERR_ADD_TRANSCEIVER'));
        }
    }

    /**
     * Add a MediaStream to the connection.
     * @param {MediaStream} stream
     */
    addStream(stream) {
        if (this.destroying) {
            return;
        }
        if (this.destroyed) {
            throw errCode(
                new Error('cannot addStream after peer is destroyed'),
                'ERR_DESTROYED',
            );
        }

        stream.getTracks().forEach((track) => {
            this.addTrack(track, stream);
        });
    }

    /**
     * Add a MediaStreamTrack to the connection.
     * @param {MediaStreamTrack} track
     * @param {MediaStream} stream
     */
    addTrack(track, stream) {
        if (this.destroying) {
            return;
        }
        if (this.destroyed) {
            throw errCode(
                new Error('cannot addTrack after peer is destroyed'),
                'ERR_DESTROYED',
            );
        }

        const submap = this.senderMap.get(track) || new Map(); // nested Maps map [track, stream] to sender
        let sender = submap.get(stream);
        if (!sender) {
            sender = stream.addTrack(track);
            submap.set(stream, sender);
            this.senderMap.set(track, submap);
            this._needsNegotiation();
        } else if (sender.removed) {
            throw errCode(
                new Error(
                    'Track has been removed. You should enable/disable tracks that you want to re-add.',
                ),
                'ERR_SENDER_REMOVED',
            );
        } else {
            throw errCode(
                new Error('Track has already been added to that stream.'),
                'ERR_SENDER_ALREADY_ADDED',
            );
        }
    }

    /**
     * Replace a MediaStreamTrack by another in the connection.
     * @param {MediaStreamTrack} oldTrack
     * @param {MediaStreamTrack} newTrack
     * @param {MediaStream} stream
     */
    replaceTrack(oldTrack, newTrack, stream) {
        if (this.destroying) {
            return;
        }
        if (this.destroyed) {
            throw errCode(
                new Error('cannot replaceTrack after peer is destroyed'),
                'ERR_DESTROYED',
            );
        }

        const submap = this.senderMap.get(oldTrack);
        const sender = submap ? submap.get(stream) : null;
        if (!sender) {
            throw errCode(
                new Error('Cannot replace track that was never added.'),
                'ERR_TRACK_NOT_ADDED',
            );
        }
        if (newTrack) {
            this.senderMap.set(newTrack, submap);
        }

        if (sender.replaceTrack != null) {
            sender.replaceTrack(newTrack);
        } else {
            this.destroy(
                errCode(
                    new Error('replaceTrack is not supported in this browser'),
                    'ERR_UNSUPPORTED_REPLACETRACK',
                ),
            );
        }
    }

    /**
     * Remove a MediaStreamTrack from the connection.
     * @param {MediaStreamTrack} track
     * @param {MediaStream} stream
     */
    removeTrack(track, stream) {
        if (this.destroying) {
            return;
        }
        if (this.destroyed) {
            throw errCode(
                new Error('cannot removeTrack after peer is destroyed'),
                'ERR_DESTROYED',
            );
        }

        const submap = this.senderMap.get(track);
        const sender = submap ? submap.get(stream) : null;
        if (!sender) {
            throw errCode(
                new Error('Cannot remove track that was never added.'),
                'ERR_TRACK_NOT_ADDED',
            );
        }
        try {
            sender.removed = true;
            this.pc.removeTrack(sender);
        } catch (err) {
            if (err.name === 'NS_ERROR_UNEXPECTED') {
                this.sendersAwaitingStable.push(sender); // HACK: Firefox must wait until (signalingState === stable) https://bugzilla.mozilla.org/show_bug.cgi?id=1133874
            } else {
                this.destroy(errCode(err, 'ERR_REMOVE_TRACK'));
            }
        }
        this._needsNegotiation();
    }

    /**
     * Remove a MediaStream from the connection.
     * @param {MediaStream} stream
     */
    removeStream(stream) {
        if (this.destroying) {
            return;
        }
        if (this.destroyed) {
            throw errCode(
                new Error('cannot removeStream after peer is destroyed'),
                'ERR_DESTROYED',
            );
        }

        stream.getTracks().forEach((track) => {
            this.removeTrack(track, stream);
        });
    }

    _needsNegotiation() {
        if (this.batchedNegotiation) {
            return;
        } // batch synchronous renegotiations
        this.batchedNegotiation = true;
        queueMicrotask(() => {
            this.batchedNegotiation = false;
            this.negotiate();
            this.firstNegotiation = false;
        });
    }

    negotiate() {
        if (this.destroying) {
            return;
        }
        if (this.destroyed) {
            throw errCode(
                new Error('cannot negotiate after peer is destroyed'),
                'ERR_DESTROYED',
            );
        }

        if (this.isNegotiating) {
            this.queuedNegotiation = true;
        } else {
            setTimeout(() => {
                // HACK: Chrome crashes if we immediately call createOffer
                this._createOffer();
            }, 0);
        }
        this.isNegotiating = true;
    }

    // TODO: Delete this method once readable-stream is updated to contain a default
    // implementation of destroy() that automatically calls _destroy()
    // See: https://github.com/nodejs/readable-stream/issues/283
    destroy(err) {
        this._destroy(err, () => {});
    }

    _destroy(err, cb) {
        if (this.destroyed || this.destroying) {
            return;
        }
        this.destroying = true;

        setTimeout(() => {
            // allow events concurrent with the call to _destroy() to fire (see #692)
            this.destroyed = true;
            this.destroying = false;

            this.readable = this.writable = false;

            // if (!this._readableState?.ended) this.push(null);
            // if (!this._writableState?.finished) this.end();

            this._connected = false;
            this.pcReady = false;
            this.channelReady = false;
            this.remoteTracks = null;
            this.remoteStreams = null;
            this.senderMap = null;

            clearInterval(this.closingInterval);
            this.closingInterval = null;

            clearInterval(this.interval);
            this.interval = null;
            this.chunk = null;
            this.cb = null;

            if (this._onFinishBound) {
                this.removeListener('finish', this._onFinishBound);
            }
            this._onFinishBound = null;

            if (this.channel) {
                try {
                    this.channel.close();
                } catch (err) {}

                // allow events concurrent with destruction to be handled
                this.channel.onmessage = null;
                this.channel.onopen = null;
                this.channel.onclose = null;
                this.channel.onerror = null;
            }
            if (this.pc) {
                try {
                    this.pc.close();
                } catch (err) {}

                // allow events concurrent with destruction to be handled
                this.pc.oniceconnectionstatechange = null;
                this.pc.onicegatheringstatechange = null;
                this.pc.onsignalingstatechange = null;
                this.pc.onicecandidate = null;
                this.pc.ontrack = null;
                this.pc.ondatachannel = null;
            }
            this.pc = null;
            this.channel = null;

            if (err) {
                this.emit('error', err);
            }
            this.emit('close');
            cb();
        }, 0);
    }

    _setupData(event) {
        if (!event.channel) {
            // In some situations `pc.createDataChannel()` returns `undefined` (in wrtc),
            // which is invalid behavior. Handle it gracefully.
            // See: https://github.com/feross/simple-peer/issues/163
            return this.destroy(
                errCode(
                    new Error(
                        'Data channel event is missing `channel` property',
                    ),
                    'ERR_DATA_CHANNEL',
                ),
            );
        }

        this.channel = event.channel;
        this.channel.binaryType = 'arraybuffer';

        if (typeof this.channel.bufferedAmountLowThreshold === 'number') {
            this.channel.bufferedAmountLowThreshold = MAX_BUFFERED_AMOUNT;
        }

        this.channelName = this.channel.label;

        this.channel.onmessage = (event) => {
            this._onChannelMessage(event);
        };
        this.channel.onbufferedamountlow = () => {
            this._onChannelBufferedAmountLow();
        };
        this.channel.onopen = () => {
            this._onChannelOpen();
        };
        this.channel.onclose = () => {
            this._onChannelClose();
        };
        this.channel.onerror = (event) => {
            const err =
                event.error instanceof Error ?
                    event.error :
                    new Error(
                        `Datachannel error: ${event.message} ${event.filename}:${event.lineno}:${event.colno}`,
                    );
            this.destroy(errCode(err, 'ERR_DATA_CHANNEL'));
        };

        // HACK: Chrome will sometimes get stuck in readyState "closing", let's check for this condition
        // https://bugs.chromium.org/p/chromium/issues/detail?id=882743
        let isClosing = false;
        this.closingInterval = setInterval(() => {
            // No "onclosing" event
            if (this.channel && this.channel.readyState === 'closing') {
                if (isClosing) {
                    this._onChannelClose();
                } // closing timed out: equivalent to onclose firing
                isClosing = true;
            } else {
                isClosing = false;
            }
        }, CHANNEL_CLOSING_TIMEOUT);
    }

    _read() {}

    _write(chunk, encoding, cb) {
        if (this.destroyed) {
            return cb(
                errCode(
                    new Error('cannot write after peer is destroyed'),
                    'ERR_DATA_CHANNEL',
                ),
            );
        }

        if (this._connected) {
            try {
                this.send(chunk);
            } catch (err) {
                return this.destroy(errCode(err, 'ERR_DATA_CHANNEL'));
            }
            if (this.channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
                this.cb = cb;
            } else {
                cb(null);
            }
        } else {
            this.chunk = chunk;
            this.cb = cb;
        }
    }

    // When stream finishes writing, close socket. Half open connections are not
    // supported.
    _onFinish() {
        if (this.destroyed) {
            return;
        }

        // Wait a bit before destroying so the socket flushes.
        // TODO: is there a more reliable way to accomplish this?
        const destroySoon = () => {
            setTimeout(() => this.destroy(), 1000);
        };

        if (this._connected) {
            destroySoon();
        } else {
            this.once('connect', destroySoon);
        }
    }

    _startIceCompleteTimeout() {
        if (this.destroyed) {
            return;
        }
        if (this.iceCompleteTimer) {
            return;
        }
        this.iceCompleteTimer = setTimeout(() => {
            if (!this.iceComplete) {
                this.iceComplete = true;
                this.emit('iceTimeout');
                this.emit('iceComplete');
            }
        }, ICECOMPLETE_TIMEOUT);
    }

    _createOffer() {
        if (this.destroyed) {
            return;
        }

        this.pc.
            createOffer({}).
            then((offer) => {
                if (this.destroyed) {
                    return;
                }

                const sendOffer = () => {
                    if (this.destroyed) {
                        return;
                    }
                    const signal = this.pc.localDescription || offer;
                    this.emit('signal', {
                        type: signal.type,
                        sdp: signal.sdp,
                    });
                };

                const onSuccess = () => {
                    if (this.destroyed) {
                        return;
                    }
                    sendOffer();
                };

                const onError = (err) => {
                    this.destroy(errCode(err, 'ERR_SET_LOCAL_DESCRIPTION'));
                };

                this.pc.
                    setLocalDescription(offer).
                    then(onSuccess).
                    catch(onError);
            }).
            catch((err) => {
                this.destroy(errCode(err, 'ERR_CREATE_OFFER'));
            });
    }

    _requestMissingTransceivers() {
        if (this.pc.getTransceivers) {
            this.pc.getTransceivers().forEach((transceiver) => {
                if (
                    !transceiver.mid &&
                    transceiver.sender.track &&
                    !transceiver.requested
                ) {
                    transceiver.requested = true; // HACK: Safari returns negotiated transceivers with a null mid
                    this.addTransceiver(transceiver.sender.track.kind);
                }
            });
        }
    }

    _createAnswer() {
        if (this.destroyed) {
            return;
        }

        this.pc.
            createAnswer({}).
            then((answer) => {
                if (this.destroyed) {
                    return;
                }

                const sendAnswer = () => {
                    if (this.destroyed) {
                        return;
                    }
                    const signal = this.pc.localDescription || answer;
                    this.emit('signal', {
                        type: signal.type,
                        sdp: signal.sdp,
                    });
                };

                const onSuccess = () => {
                    if (this.destroyed) {
                        return;
                    }
                    sendAnswer();
                };

                const onError = (err) => {
                    this.destroy(errCode(err, 'ERR_SET_LOCAL_DESCRIPTION'));
                };

                this.pc.
                    setLocalDescription(answer).
                    then(onSuccess).
                    catch(onError);
            }).
            catch((err) => {
                this.destroy(errCode(err, 'ERR_CREATE_ANSWER'));
            });
    }

    _onConnectionStateChange() {
        if (this.destroyed) {
            return;
        }
        if (this.pc.connectionState === 'failed') {
            this.destroy(
                errCode(
                    new Error('Connection failed.'),
                    'ERR_CONNECTION_FAILURE',
                ),
            );
        }
    }

    _onIceStateChange() {
        if (this.destroyed) {
            return;
        }
        const iceConnectionState = this.pc.iceConnectionState;
        const iceGatheringState = this.pc.iceGatheringState;

        this.emit('iceStateChange', iceConnectionState, iceGatheringState);

        if (
            iceConnectionState === 'connected' ||
            iceConnectionState === 'completed'
        ) {
            this.pcReady = true;
            this._maybeReady();
        }
        if (iceConnectionState === 'failed') {
            this.destroy(
                errCode(
                    new Error('Ice connection failed.'),
                    'ERR_ICE_CONNECTION_FAILURE',
                ),
            );
        }
        if (iceConnectionState === 'closed') {
            this.destroy(
                errCode(
                    new Error('Ice connection closed.'),
                    'ERR_ICE_CONNECTION_CLOSED',
                ),
            );
        }
    }

    getStats(cb) {
        // statreports can come with a value array instead of properties
        const flattenValues = (report) => {
            if (
                Object.prototype.toString.call(report.values) ===
                '[object Array]'
            ) {
                report.values.forEach((value) => {
                    Object.assign(report, value);
                });
            }
            return report;
        };

        // Promise-based getStats() (standard)
        if (this.pc.getStats.length === 0 || this._isReactNativeWebrtc) {
            this.pc.getStats().then(
                (res) => {
                    const reports = [];
                    res.forEach((report) => {
                        reports.push(flattenValues(report));
                    });
                    cb(null, reports);
                },
                (err) => cb(err),
            );

            // Single-parameter callback-based getStats() (non-standard)
        } else if (this.pc.getStats.length > 0) {
            this.pc.getStats(
                (res) => {
                    // If we destroy connection in `connect` callback this code might happen to run when actual connection is already closed
                    if (this.destroyed) {
                        return;
                    }

                    const reports = [];
                    res.result().forEach((result) => {
                        const report = {};
                        result.names().forEach((name) => {
                            report[name] = result.stat(name);
                        });
                        report.id = result.id;
                        report.type = result.type;
                        report.timestamp = result.timestamp;
                        reports.push(flattenValues(report));
                    });
                    cb(null, reports);
                },
                (err) => cb(err),
            );

            // Unknown browser, skip getStats() since it's anyone's guess which style of
            // getStats() they implement.
        } else {
            cb(null, []);
        }
    }

    _maybeReady() {
        if (
            this._connected ||
            this._connecting ||
            !this.pcReady ||
            !this.channelReady
        ) {
            return;
        }

        this._connecting = true;

        // HACK: We can't rely on order here, for details see https://github.com/js-platform/node-webrtc/issues/339
        const findCandidatePair = () => {
            if (this.destroyed) {
                return;
            }

            this.getStats((err, items) => {
                if (this.destroyed) {
                    return;
                }

                // Treat getStats error as non-fatal. It's not essential.
                if (err) {
                    items = [];
                }

                const remoteCandidates = {};
                const localCandidates = {};
                const candidatePairs = {};
                let foundSelectedCandidatePair = false;

                items.forEach((item) => {
                    // TODO: Once all browsers support the hyphenated stats report types, remove
                    // the non-hypenated ones
                    if (
                        item.type === 'remotecandidate' ||
                        item.type === 'remote-candidate'
                    ) {
                        remoteCandidates[item.id] = item;
                    }
                    if (
                        item.type === 'localcandidate' ||
                        item.type === 'local-candidate'
                    ) {
                        localCandidates[item.id] = item;
                    }
                    if (
                        item.type === 'candidatepair' ||
                        item.type === 'candidate-pair'
                    ) {
                        candidatePairs[item.id] = item;
                    }
                });

                const setSelectedCandidatePair = (selectedCandidatePair) => {
                    foundSelectedCandidatePair = true;

                    let local =
                        localCandidates[selectedCandidatePair.localCandidateId];

                    if (local && (local.ip || local.address)) {
                        // Spec
                        this.localAddress = local.ip || local.address;
                        this.localPort = Number(local.port);
                    } else if (local && local.ipAddress) {
                        // Firefox
                        this.localAddress = local.ipAddress;
                        this.localPort = Number(local.portNumber);
                    } else if (
                        typeof selectedCandidatePair.googLocalAddress ===
                        'string'
                    ) {
                        // TODO: remove this once Chrome 58 is released
                        local =
                            selectedCandidatePair.googLocalAddress.split(':');
                        this.localAddress = local[0];
                        this.localPort = Number(local[1]);
                    }
                    if (this.localAddress) {
                        this.localFamily = this.localAddress.includes(':') ?
                            'IPv6' :
                            'IPv4';
                    }

                    let remote =
                        remoteCandidates[
                            selectedCandidatePair.remoteCandidateId
                        ];

                    if (remote && (remote.ip || remote.address)) {
                        // Spec
                        this.remoteAddress = remote.ip || remote.address;
                        this.remotePort = Number(remote.port);
                    } else if (remote && remote.ipAddress) {
                        // Firefox
                        this.remoteAddress = remote.ipAddress;
                        this.remotePort = Number(remote.portNumber);
                    } else if (
                        typeof selectedCandidatePair.googRemoteAddress ===
                        'string'
                    ) {
                        // TODO: remove this once Chrome 58 is released
                        remote =
                            selectedCandidatePair.googRemoteAddress.split(':');
                        this.remoteAddress = remote[0];
                        this.remotePort = Number(remote[1]);
                    }
                    if (this.remoteAddress) {
                        this.remoteFamily = this.remoteAddress.includes(':') ?
                            'IPv6' :
                            'IPv4';
                    }
                };

                items.forEach((item) => {
                    // Spec-compliant
                    if (
                        item.type === 'transport' &&
                        item.selectedCandidatePairId
                    ) {
                        setSelectedCandidatePair(
                            candidatePairs[item.selectedCandidatePairId],
                        );
                    }

                    // Old implementations
                    if (
                        (item.type === 'googCandidatePair' &&
                            item.googActiveConnection === 'true') ||
                        ((item.type === 'candidatepair' ||
                            item.type === 'candidate-pair') &&
                            item.selected)
                    ) {
                        setSelectedCandidatePair(item);
                    }
                });

                // Ignore candidate pair selection in browsers like Safari 11 that do not have any local or remote candidates
                // But wait until at least 1 candidate pair is available
                if (
                    !foundSelectedCandidatePair &&
                    (!Object.keys(candidatePairs).length ||
                        Object.keys(localCandidates).length)
                ) {
                    setTimeout(findCandidatePair, 100);
                    return;
                }
                this._connecting = false;
                this._connected = true;

                if (this.chunk) {
                    try {
                        this.send(this.chunk);
                    } catch (err) {
                        return this.destroy(errCode(err, 'ERR_DATA_CHANNEL'));
                    }
                    this.chunk = null;

                    const cb = this.cb;
                    this.cb = null;
                    cb(null);
                }

                // If `bufferedAmountLowThreshold` and 'onbufferedamountlow' are unsupported,
                // fallback to using setInterval to implement backpressure.
                if (
                    typeof this.channel.bufferedAmountLowThreshold !== 'number'
                ) {
                    this.interval = setInterval(() => this._onInterval(), 150);
                    if (this.interval.unref) {
                        this.interval.unref();
                    }
                }

                this.emit('connect');
            });
        };
        findCandidatePair();
    }

    _onInterval() {
        if (
            !this.cb ||
            !this.channel ||
            this.channel.bufferedAmount > MAX_BUFFERED_AMOUNT
        ) {
            return;
        }
        this._onChannelBufferedAmountLow();
    }

    _onSignalingStateChange() {
        if (this.destroyed) {
            return;
        }

        if (this.pc.signalingState === 'stable') {
            this.isNegotiating = false;

            // HACK: Firefox doesn't yet support removing tracks when signalingState !== 'stable'
            this.sendersAwaitingStable.forEach((sender) => {
                this.pc.removeTrack(sender);
                this.queuedNegotiation = true;
            });
            this.sendersAwaitingStable = [];

            if (this.queuedNegotiation) {
                this.queuedNegotiation = false;
                this._needsNegotiation(); // negotiate again
            } else {
                this.emit('negotiated');
            }
        }

        this.emit('signalingStateChange', this.pc.signalingState);
    }

    _onIceCandidate(event) {
        if (this.destroyed) {
            return;
        }
        if (event.candidate) {
            this.emit('signal', {
                type: 'candidate',
                candidate: {
                    candidate: event.candidate.candidate,
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                    sdpMid: event.candidate.sdpMid,
                },
            });
        } else if (!event.candidate && !this.iceComplete) {
            this.iceComplete = true;
            this.emit('iceComplete');
        }

        // as soon as we've received one valid candidate start timeout
        if (event.candidate) {
            this._startIceCompleteTimeout();
        }
    }

    _onChannelMessage(event) {
        if (this.destroyed) {
            return;
        }
        let data = event.data;
        if (data instanceof ArrayBuffer) {
            data = Buffer.from(data);
        }
        this.push(data);
    }

    _onChannelBufferedAmountLow() {
        if (this.destroyed || !this.cb) {
            return;
        }
        const cb = this.cb;
        this.cb = null;
        cb(null);
    }

    _onChannelOpen() {
        if (this._connected || this.destroyed) {
            return;
        }
        this.channelReady = true;
        this._maybeReady();
    }

    _onChannelClose() {
        if (this.destroyed) {
            return;
        }
        this.destroy();
    }

    _onStream(event) {
        if (this.destroyed) {
            return;
        }

        event.target.remoteStreams.forEach((eventStream) => {
            eventStream._tracks.forEach((eventTrack) => {
                if (
                    this.remoteTracks.some((remoteTrack) => {
                        return remoteTrack.id === eventTrack.id;
                    })
                ) {
                    return;
                } // Only fire one 'stream' event, even though there may be multiple tracks per stream

                this.remoteTracks.push({track: event.track, stream: eventStream});
                this.emit('track', eventTrack, eventStream);
            });


            if (
                this.remoteStreams.some((remoteStream) => {
                    return remoteStream.id === eventStream.id;
                })
            ) {
                return;
            } // Only fire one 'stream' event, even though there may be multiple tracks per stream

            this.remoteStreams.push(eventStream);
            queueMicrotask(() => {
                this.emit('stream', eventStream); // ensure all tracks have been added
            });
        });
    }
}

Peer.WEBRTC_SUPPORT = true;

/**
 * Expose peer and data channel config for overriding all Peer
 * instances. Otherwise, just set opts.config or opts.channelConfig
 * when constructing a Peer.
 */
Peer.config = {
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:global.stun.twilio.com:3478',
            ],
        },
    ],
    sdpSemantics: 'unified-plan'
};

Peer.channelConfig = {};
