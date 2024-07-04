import Foundation

public enum NetworkError: Error {
    public enum ServerTrustFailureReason {
        /// The output of a server trust evaluation.
        public struct Output {
            /// The host for which the evaluation was performed.
            public let host: String
            /// The `SecTrust` value which was evaluated.
            public let trust: SecTrust
            /// The `OSStatus` of evaluation operation.
            public let status: OSStatus
            /// The result of the evaluation operation.
            public let result: SecTrustResultType

            /// Creates an `Output` value from the provided values.
            init(_ host: String, _ trust: SecTrust, _ status: OSStatus, _ result: SecTrustResultType) {
                self.host = host
                self.trust = trust
                self.status = status
                self.result = result
            }
        }

        /// No certificates were found with which to perform the trust evaluation.
        case noCertificatesFound
        /// During evaluation, application of the associated `SecPolicy` failed.
        case policyApplicationFailed(trust: SecTrust, policy: SecPolicy, status: OSStatus)
        /// `SecTrust` evaluation failed with the associated `Error`, if one was produced.
        case trustEvaluationFailed(error: Error?)
        /// Default evaluation failed with the associated `Output`.
        case defaultEvaluationFailed(output: Output)
        /// Host validation failed with the associated `Output`.
        case hostValidationFailed(output: Output)
        /// Certificate pinning failed.
        case certificatePinningFailed(host: String, trust: SecTrust, pinnedCertificates: [SecCertificate], serverCertificates: [SecCertificate])
    }
    
    case serverTrustEvaluationFailed(reason: ServerTrustFailureReason)
}

extension NetworkError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case let .serverTrustEvaluationFailed(reason):
            return "Server trust evaluation failed due to reason: \(reason.localizedDescription)"
        }
    }
}

extension NetworkError.ServerTrustFailureReason {
    var localizedDescription: String {
        switch self {
        case .noCertificatesFound:
            return "No certificates were found or provided for evaluation."
        case .policyApplicationFailed:
            return "Attempting to set a SecPolicy failed."
        case let .trustEvaluationFailed(error):
            return "SecTrust evaluation failed with error: \(error?.localizedDescription ?? "None")"
        case let .defaultEvaluationFailed(output):
            return "Default evaluation failed for host \(output.host)."
        case let .hostValidationFailed(output):
            return "Host validation failed for host \(output.host)."
        case let .certificatePinningFailed(host, _, pinnedCertificates, _):
            return "Certificate pinning failed for host \(host) after evaluating \(pinnedCertificates.count) installed certificates."
        }
    }
}
