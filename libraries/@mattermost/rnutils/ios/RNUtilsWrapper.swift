import Foundation
import React

@objc public class RNUtilsWrapper: NSObject {
    @objc public weak var delegate: RNUtilsDelegate? = nil
    
    deinit {
        DispatchQueue.main.async {
            guard let w = UIApplication.shared.delegate?.window, let window = w else { return }
            window.removeObserver(self, forKeyPath: "frame")
        }
    }
    
    func getSharedDirectory() -> URL? {
        let fileManager = FileManager.default
        return fileManager.containerURL(forSecurityApplicationGroupIdentifier: getAppGroupId())
    }
    
    func getDatabasePath() -> String {
        guard let sharedDirectory = getSharedDirectory() else {
            return ""
        }
        return sharedDirectory.appendingPathComponent("databases").path
    }
    
    func isRunningInFullScreen() -> Bool {
        guard let w = UIApplication.shared.delegate?.window, let window = w else { return false }
        let screenSize = window.screen.bounds.size.width
        let frameSize = window.frame.size.width
        let shouldBeConsideredFullScreen = frameSize >= (screenSize * 0.6)
        return shouldBeConsideredFullScreen
    }
    
    @objc public func captureEvents() {
        DispatchQueue.main.async {
            guard let w = UIApplication.shared.delegate?.window, let window = w else { return }
            window.addObserver(self, forKeyPath: "frame", options: .new, context: nil)
        }
    }
    
    override public func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "frame" {
            isSplitView()
        }
    }
    
    @objc func isSplitView() {
        if UIDevice.current.userInterfaceIdiom == .pad {
            delegate?.sendEvent(name: "SplitViewChanged", result: [
                "isSplit": !isRunningInFullScreen(),
                "isTablet": UIDevice.current.userInterfaceIdiom == .pad,
            ])
        }
    }
    
    @objc public func getAppGroupId() -> String {
        let bundle = Bundle.main
        guard let appGroupId = bundle.object(forInfoDictionaryKey: "AppGroupIdentifier") as? String else {
            return ""
        }
        
        return appGroupId
    }
    
    @objc public func appGroupSharedDirectory() -> Dictionary<String, Any> {
        let fileManager = FileManager.default
        let sharedDirectory = fileManager.containerURL(forSecurityApplicationGroupIdentifier: getAppGroupId())
        let databasePath = sharedDirectory?.appendingPathComponent("databases")
        var results = Dictionary<String, Any>()
        
        guard let dbPath = databasePath,
              let shared = sharedDirectory else {
            results["sharedDirectory"] = ""
            results["databasePath"] = ""
            return results
        }
        
        try? fileManager.createDirectory(at: dbPath, withIntermediateDirectories: true, attributes: nil)
        
        results["sharedDirectory"] = shared.path
        results["databasePath"] = dbPath.path
        return results
    }
    
    @objc public func deleteDatabaseDirectory(databaseName: String?, shouldRemoveDirectory: Bool) -> Dictionary<String, Any> {
        let appGroupDatabaseDir = getDatabasePath()
        guard !appGroupDatabaseDir.isEmpty else {
            return [
                "error": "No app group directory found",
                "success": false
            ]
        }
        
        guard let name = databaseName, !name.isEmpty else {
            return [
                "error": "database name should not be null or empty",
                "success": false
            ]
        }
        
        let databaseFile = "\(appGroupDatabaseDir)/\(name).db"
        let databaseDirOrFile = shouldRemoveDirectory ? appGroupDatabaseDir : databaseFile
        let fileManager = FileManager.default
        
        let walFile = "\(databaseFile)-wal"
        if !shouldRemoveDirectory && fileManager.fileExists(atPath: walFile) {
            try? fileManager.removeItem(atPath: walFile)
        }
        
        let shmFile = "\(databaseFile)-shm"
        if !shouldRemoveDirectory && fileManager.fileExists(atPath: shmFile) {
            try? fileManager.removeItem(atPath: shmFile)
        }
        
        do {
            try fileManager.removeItem(atPath: databaseDirOrFile)
            return [
                "error": "",
                "success": true
            ]
        } catch {
            return [
                "error": error.localizedDescription,
                "success": false
            ]
        }
    }
    
    @objc public func renameDatabase(databaseName: String?, newDatabaseName: String?) -> Dictionary<String, Any> {
        guard let appGroupDir = getSharedDirectory() else {
            return [
                "error": "No app group directory found",
                "success": false
            ]
        }
        
        guard let name = databaseName,
              let newName = newDatabaseName,
              !name.isEmpty, !newName.isEmpty else {
            return [
                "error": "database name and the new database name should not be null or empty",
                "success": false
            ]
        }
        
        let fileManager = FileManager.default
        let databaseDir = "\(appGroupDir.path)/\(name).db"
        let walFile = "\(databaseDir)-wal"
        let shmFile = "\(databaseDir)-shm"
        if !fileManager.fileExists(atPath: databaseDir) {
            return [
                "error": "database file is not does not exists",
                "success": false
            ]
        }
        
        let newDatabaseDir = "\(appGroupDir.path)/\(newName).db"
        let destinationFileExists = fileManager.fileExists(atPath: newDatabaseDir)
        let dstWal = "\(newDatabaseDir)-wal"
        let dstShm = "\(newDatabaseDir)-shm"
        
        if !destinationFileExists && fileManager.fileExists(atPath: walFile) {
            try? fileManager.moveItem(atPath: walFile, toPath: dstWal)
        }
        
        if !destinationFileExists && fileManager.fileExists(atPath: shmFile) {
            try? fileManager.moveItem(atPath: shmFile, toPath: dstShm)
        }
        
        do {
            try fileManager.moveItem(atPath: databaseDir, toPath: newDatabaseDir)
            return [
                "error": "",
                "success": true
            ]
        } catch {
            return [
                "error": error.localizedDescription,
                "success": false
            ]
        }
    }
    
    @objc public func deleteEntitiesFile() -> NSNumber {
        guard let appGroupDir = getSharedDirectory() else {
            return NSNumber(false)
        }
        
        let file = "\(appGroupDir)/entities"
        do {
            try FileManager.default.removeItem(atPath: file)
            return NSNumber(true)
        } catch {
            return NSNumber(false)
        }
    }
    
    @objc public func isRunningInSplitView() -> Dictionary<String, Any> {
        let queue = DispatchQueue.main
            let group = DispatchGroup()
            var shouldBeConsideredFullScreen = true
            group.enter()
            queue.async(group: group) { [weak self] in
              shouldBeConsideredFullScreen = self?.isRunningInFullScreen() ?? true
              group.leave()
            }
            group.wait()
            return [
              "isSplit": !shouldBeConsideredFullScreen,
              "isTablet": UIDevice.current.userInterfaceIdiom == .pad,
            ]
    }
    
    @objc public func unlockOrientation() {
        DispatchQueue.main.async {
            OrientationManager.shared.unlockOrientation()
            UIDevice.current.setValue(UIInterfaceOrientation.unknown.rawValue, forKey: "orientation")
            UINavigationController.attemptRotationToDeviceOrientation()
        }
    }
    
    @objc public func lockOrientation() {
        DispatchQueue.main.async {
            OrientationManager.shared.lockOrientation()
            UIDevice.current.setValue(UIInterfaceOrientation.portrait.rawValue, forKey: "orientation")
            UINavigationController.attemptRotationToDeviceOrientation()
        }
    }
}



