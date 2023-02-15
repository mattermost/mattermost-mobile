import Foundation

extension Network: URLSessionDelegate, URLSessionTaskDelegate {
    public func urlSession(_ session: URLSession,
                    task: URLSessionTask,
                    didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        var credential: URLCredential? = nil
        var disposition: URLSession.AuthChallengeDisposition = .performDefaultHandling

        let authMethod = challenge.protectionSpace.authenticationMethod
        if authMethod == NSURLAuthenticationMethodClientCertificate {
            let host = task.currentRequest!.url!.host!
            if let (identity, certificate) = try? Keychain.default.getClientIdentityAndCertificate(for: host) {
                credential = URLCredential(identity: identity,
                                           certificates: [certificate],
                                           persistence: URLCredential.Persistence.permanent)
            }
            disposition = .useCredential
        }

        completionHandler(disposition, credential)
    }
}
