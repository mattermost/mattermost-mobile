import Foundation
import os.log

extension Network: URLSessionDelegate, URLSessionTaskDelegate {
    typealias ChallengeEvaluation = (disposition: URLSession.AuthChallengeDisposition, credential: URLCredential?, error: NetworkError?)
    
    public func urlSession(_ session: URLSession,
                    task: URLSessionTask,
                    didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        var evaluation: ChallengeEvaluation
        switch challenge.protectionSpace.authenticationMethod {
        #if canImport(Security)
        case NSURLAuthenticationMethodServerTrust:
            evaluation = attemptServerTrustAuthentication(with: challenge)
        case NSURLAuthenticationMethodClientCertificate:
            evaluation = attemptClientAuthentication(with: challenge)
        #endif
        default:
            evaluation = (.performDefaultHandling, nil, nil)
        }
        
        if let error = evaluation.error {
            os_log("Gekidou: %{public}@",
                   log: .default,
                   type: .error,
                   error.localizedDescription
            )
        }
        
        completionHandler(evaluation.disposition, evaluation.credential)
    }
    
    func attemptClientAuthentication(with challenge: URLAuthenticationChallenge) -> ChallengeEvaluation{
        let host = challenge.protectionSpace.host
        
        guard let (identity, certificate) = try? Keychain.default.getClientIdentityAndCertificate(for: host) else {
            return (.performDefaultHandling, nil, nil)
        }
        
        return (.useCredential, URLCredential(identity: identity,
                                              certificates: [certificate],
                                              persistence: URLCredential.Persistence.permanent
                                             ), nil)
    }
    
    func attemptServerTrustAuthentication(with challenge: URLAuthenticationChallenge) -> ChallengeEvaluation {
        let host = challenge.protectionSpace.host
        
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let trust = challenge.protectionSpace.serverTrust
        else {
            return (.performDefaultHandling, nil, nil)
        }
        
        do {
            guard let certs = certificates[host], !certs.isEmpty else {
                return (.performDefaultHandling, nil, nil)
            }

            try performDefaultValidation(trust)
            
            try performValidation(trust, forHost: host)
            
            try evaluate(trust, forHost: host, withCerts: certs)
            
            return (.useCredential, URLCredential(trust: trust), nil)
        } catch {
            os_log("Gekidou: %{public}@",
                   log: .default,
                   type: .error,
                   error.localizedDescription
            )
            return (.cancelAuthenticationChallenge, nil, error as? NetworkError)
        }
    }
    
    private func getServerTrustCertificates(_ trust: SecTrust) -> [SecCertificate] {
        if #available(iOS 15, macOS 12, tvOS 15, watchOS 8, visionOS 1, *) {
            return (SecTrustCopyCertificateChain(trust) as? [SecCertificate]) ?? []
        } else {
            return (0..<SecTrustGetCertificateCount(trust)).compactMap { index in
                SecTrustGetCertificateAtIndex(trust, index)
            }
        }
    }
    
    private func performDefaultValidation(_ trust: SecTrust) throws {
        let policy = SecPolicyCreateSSL(true, nil)
        try evaluate(trust, afterApplying: policy)
    }
    
    private func performValidation(_ trust: SecTrust, forHost host: String) throws {
        let policy = SecPolicyCreateSSL(true, host as CFString)
        try evaluate(trust, afterApplying: policy)
    }
    
    private func evaluate(_ trust: SecTrust, afterApplying policy: SecPolicy) throws {
        let status = SecTrustSetPolicies(trust, policy)
        guard status == errSecSuccess else {
            throw NetworkError.serverTrustEvaluationFailed(reason: .policyApplicationFailed(trust: trust, policy: policy, status: status))
        }
        
        var error: CFError?
        let evaluationSucceeded = SecTrustEvaluateWithError(trust, &error)
        if !evaluationSucceeded {
            throw NetworkError.serverTrustEvaluationFailed(reason: .trustEvaluationFailed(error: error))
        }
    }
    
    private func evaluate(_ trust: SecTrust, forHost host: String, withCerts certs: [SecCertificate]) throws {
        let serverCertificates = getServerTrustCertificates(trust)
        let serverCertificatesData = Set(serverCertificates.map { SecCertificateCopyData($0) as Data })
        let pinnedCertificatesData = Set(certs.map { SecCertificateCopyData($0) as Data })
        let pinnedCertificatesInServerData = !serverCertificatesData.isDisjoint(with: pinnedCertificatesData)
        if !pinnedCertificatesInServerData {
            throw NetworkError.serverTrustEvaluationFailed(reason: .certificatePinningFailed(host: host, trust: trust, pinnedCertificates: certs, serverCertificates: serverCertificates))
        }
    }
}
