//
//  Network.swift
//  Gekidou
//
//  Created by Miguel Alatzar on 8/20/21.
//

import Foundation

public typealias ResponseHandler = (_ data: Data?, _ response: URLResponse?, _ error: Error?) -> Void

public class Network: NSObject {
    internal var session: URLSession?
    internal let queue = OperationQueue()
    internal let urlVersion = "/api/v4"
    internal var certificates: [String: [SecCertificate]] = [:]

    // Track active network tasks for potential cancellation
    private var activeTasks = NSMutableSet()
    private let tasksLock = NSLock()

    @objc public static let `default` = Network()

    override private init() {
        super.init()

        loadPinnedCertificates()

        queue.maxConcurrentOperationCount = 1

        let config = URLSessionConfiguration.default
        config.httpAdditionalHeaders = ["X-Requested-With": "XMLHttpRequest"]
        config.allowsCellularAccess = true
        config.httpMaximumConnectionsPerHost = 10
        // Reduced timeouts for notification extension (iOS terminates extension at 30s)
        config.timeoutIntervalForRequest = 15.0  // 15 second timeout per request
        config.timeoutIntervalForResource = 20.0 // 20 second total timeout (well under 30s limit)

        self.session = URLSession.init(
            configuration: config,
            delegate: self,
            delegateQueue: nil
        )
    }

    // Cancel all active network requests (useful for extension termination)
    @objc public func cancelAllRequests() {
        tasksLock.lock()
        defer { tasksLock.unlock() }

        for task in activeTasks {
            if let urlTask = task as? URLSessionTask {
                urlTask.cancel()
            }
        }
        activeTasks.removeAllObjects()
    }

    private func trackTask(_ task: URLSessionTask) {
        tasksLock.lock()
        defer { tasksLock.unlock() }
        activeTasks.add(task)
    }

    private func untrackTask(withIdentifier identifier: Int) {
        tasksLock.lock()
        defer { tasksLock.unlock() }
        if let tasks = activeTasks.allObjects as? [URLSessionTask],
           let taskToRemove = tasks.first(where: { $0.taskIdentifier == identifier }) {
            activeTasks.remove(taskToRemove)
        }
    }
    
    internal func loadPinnedCertificates() {
        guard let certsPath = Bundle.app.resourceURL?.appendingPathComponent("certs") else {
            return
        }
        
        let fileManager = FileManager.default
        do {
            let certsArray = try fileManager.contentsOfDirectory(at: certsPath, includingPropertiesForKeys: nil, options: .skipsHiddenFiles)
            let certs = certsArray.filter{ $0.pathExtension == "crt" || $0.pathExtension == "cer"}
                for cert in certs {
                    if let domain = URL(string: cert.absoluteString)?.deletingPathExtension().lastPathComponent,
                       let certData = try? Data(contentsOf: cert),
                       let certificate = SecCertificateCreateWithData(nil, certData as CFData){
                        if certificates[domain] != nil {
                            certificates[domain]?.append(certificate)
                        } else {
                            certificates[domain] = [certificate]
                        }
                        GekidouLogger.shared.log(.info, "Gekidou: loaded certificate %{public}@ for domain %{public}@", cert.lastPathComponent, domain)
                    }
                }
        } catch {
            GekidouLogger.shared.log(.error, "Gekidou: Error loading pinned certificates -- %{public}@", String(describing: error))
        }
    }
    
    internal func buildApiUrl(_ serverUrl: String, _ endpoint: String) -> URL? {
        return URL(string: "\(serverUrl)\(urlVersion)\(endpoint)")
    }
    
    internal func responseOK(_ response: URLResponse?) -> Bool {
        return (response as? HTTPURLResponse)?.statusCode == 200
    }
    
    internal func buildURLRequest(for url: URL, usingMethod method: String, withBody body: Data?, andHeaders headers: [String:String]?, forServerUrl serverUrl: String) -> URLRequest {
        let request = NSMutableURLRequest(url: url)
        request.httpMethod = method
        
        if let body = body {
            request.httpBody = body
        }
        
        if let headers = headers {
            for (key, value) in headers {
                request.setValue(value, forHTTPHeaderField: key)
            }
        }
        
        if let credentials = try? Keychain.default.getCredentials(for: serverUrl) {
            if let token = credentials.token {
                request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            if let preauthSecret = credentials.preauthSecret {
                request.addValue(preauthSecret, forHTTPHeaderField: GekidouConstants.HEADER_X_MATTERMOST_PREAUTH_SECRET)
            }
        }
        
        return request as URLRequest
    }
    
    internal func request(_ url: URL, usingMethod method: String, forServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        return request(url, withMethod: method, withBody: nil, andHeaders: nil, forServerUrl: serverUrl, completionHandler: completionHandler)
    }
    
    internal func request(_ url: URL, withMethod method: String, withBody body: Data?, andHeaders headers: [String:String]?, forServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        guard let session = session else {
            GekidouLogger.shared.log(.error, "Gekidou Network: URLSession is nil, cannot make request")
            completionHandler(nil, nil, NSError(domain: "GekidouNetwork", code: -1, userInfo: [NSLocalizedDescriptionKey: "URLSession not initialized"]))
            return
        }

        let urlRequest = buildURLRequest(for: url, usingMethod: method, withBody: body, andHeaders: headers, forServerUrl: serverUrl)

        var taskId = 0
        let task = session.dataTask(with: urlRequest) { [weak self] data, response, error in
            defer { self?.untrackTask(withIdentifier: taskId) }
            completionHandler(data, response, error)
        }
        taskId = task.taskIdentifier
        trackTask(task)
        task.resume()

    }
}
