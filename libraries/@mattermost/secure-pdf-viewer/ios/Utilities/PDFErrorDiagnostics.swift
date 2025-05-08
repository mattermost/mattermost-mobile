import Foundation
import PDFKit
import UIKit

enum PDFError: Error {
    case fileCorrupted
    case fileNotPDF
    case fileTooLarge(size: Int64, limit: Int64)
    case memoryError
    case incompatibleFormat
    case unknownError
    case internalError(_ error: Error)
    
    var description: String {
        switch self {
        case .fileCorrupted:
            return "The PDF file appears to be corrupted or damaged."
        case .fileNotPDF:
            return "The file is not a valid PDF document."
        case .fileTooLarge(let size, let limit):
            let sizeInMB = Double(size) / (1024 * 1024)
            let limitInMB = Double(limit) / (1024 * 1024)
            return "The PDF file is too large to process: \(String(format: "%.1f", sizeInMB)) MB. Maximum supported size is \(String(format: "%.0f", limitInMB)) MB."
        case .memoryError:
            return "Not enough memory to load the PDF file."
        case .incompatibleFormat:
            return "This PDF uses unsupported features or an incompatible format."
        case .unknownError:
            return "An unknown error occurred while opening the PDF file."
        case .internalError(let error):
            return "An internal error occurred while opening the PDF file.\n\(error.localizedDescription)"
        }
    }
}

class PDFDiagnostics {
    // Default values that will be overridden by device detection
    private static var _maxPDFSize: Int64 = 200 * 1024 * 1024 // 200 MB default
    private static var hasInitializedDeviceLimit = false
    
    /// Maximum allowed PDF file size in bytes, dynamically adjusted for the device
    static var maxPDFSize: Int64 {
        get {
            // Initialize device-specific limit on first access
            if !hasInitializedDeviceLimit {
                _maxPDFSize = determineOptimalPDFSizeLimit()
                hasInitializedDeviceLimit = true
            }
            return _maxPDFSize
        }
        set { _maxPDFSize = newValue }
    }
    
    /// Sets the maximum allowed PDF size in megabytes (overrides automatic detection)
    static func setMaxPDFSizeInMB(_ megabytes: Double) {
        _maxPDFSize = Int64(megabytes * 1024 * 1024)
        hasInitializedDeviceLimit = true // Prevent auto-detection
    }
    
    /// Determines the optimal PDF size limit based on device capabilities
    private static func determineOptimalPDFSizeLimit() -> Int64 {
        // Get device memory information
        let physicalMemory = ProcessInfo.processInfo.physicalMemory
        let memoryInGB = Double(physicalMemory) / (1024 * 1024 * 1024)
        
        // Base limit primarily on available memory
        let baseLimit: Int64
        if memoryInGB >= 6 {
            // High-memory devices: 6GB+ RAM
            baseLimit = 500 * 1024 * 1024 // 500MB
        } else if memoryInGB >= 4 {
            // Mid-range devices: 4-6GB RAM
            baseLimit = 300 * 1024 * 1024 // 300MB
        } else if memoryInGB >= 2 {
            // Low-memory devices: 2-4GB RAM
            baseLimit = 150 * 1024 * 1024 // 150MB
        } else {
            // Very limited devices: <2GB RAM
            baseLimit = 75 * 1024 * 1024 // 75MB
        }
        
        // Apply device type adjustment
        let deviceTypeAdjustedLimit: Int64
        if UIDevice.current.userInterfaceIdiom == .pad {
            // iPads generally have better thermal management and can handle larger files
            deviceTypeAdjustedLimit = Int64(Double(baseLimit) * 1.3)
        } else {
            // iPhones and other devices use the base limit
            deviceTypeAdjustedLimit = baseLimit
        }
        
        // Adjust based on current available memory at runtime
        return adjustLimitBasedOnAvailableMemory(deviceTypeAdjustedLimit)
    }
    
    /// Further adjusts the limit based on currently available memory
    private static func adjustLimitBasedOnAvailableMemory(_ baseLimit: Int64) -> Int64 {
        // Try to get free memory
        if let freeMemory = getAvailableMemory() {
            let freeMemoryInMB = Double(freeMemory) / (1024 * 1024)
            
            // If very low on memory, reduce limits to avoid crashes
            if freeMemoryInMB < 500 {
                return min(baseLimit, 100 * 1024 * 1024) // 100MB max when low on memory
            }
            
            // If plenty of free memory, we can be more generous
            if freeMemoryInMB > 2000 { // 2GB+ free
                return Int64(Double(baseLimit) * 1.2) // 20% boost
            }
        }
        
        // Check if running in simulator (for development)
#if targetEnvironment(simulator)
        return 600 * 1024 * 1024 // 600MB for simulator
#else
        return baseLimit
#endif
    }
    
    /// Attempts to get the amount of free memory available on the device
    private static func getAvailableMemory() -> UInt64? {
        var pageSize: vm_size_t = 0
        var info = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size / MemoryLayout<natural_t>.size)
        
        let kerr = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &count)
            }
        }
        
        if kerr == KERN_SUCCESS {
            host_page_size(mach_host_self(), &pageSize)
            let totalMemory = ProcessInfo.processInfo.physicalMemory
            let usedMemory = UInt64(info.resident_size)
            return totalMemory - usedMemory
        }
        
        return nil
    }
    
    /// Diagnoses why a PDF document failed to load
    static func diagnoseLoadFailure(at url: URL) -> PDFError {
        // If we have a valid PDF header but PDFDocument failed to load,
        // try to determine if it's corrupted or has format issues
        do {
            // Only read a small portion of the file to check structure
            let data = try Data(contentsOf: url, options: .alwaysMapped)
            
            // Try with CGPDFDocument for lower-level diagnosis
            if let provider = CGDataProvider(data: data as CFData),
               let _ = CGPDFDocument(provider) {
                
                // If CGPDFDocument loads but PDFKit's PDFDocument doesn't,
                // it might be using unsupported features
                return .incompatibleFormat
            } else {
                // Neither loads - likely corrupted
                return .fileCorrupted
            }
        } catch let dataError as NSError {
            // Check for memory-related errors by examining the error description
            // since the specific error code varies between iOS versions
            let errorDesc = dataError.localizedDescription.lowercased()
            
            if dataError.domain == NSCocoaErrorDomain &&
                (errorDesc.contains("memory") ||
                 errorDesc.contains("ram") ||
                 errorDesc.contains("resource") ||
                 errorDesc.contains("allocation")) {
                return .memoryError
            }
            return .fileCorrupted
        }
    }
    
    /// Diagnoses if a PDF document will fail to load
    static func diagnosePotentialLoadFailure(at url: URL) -> PDFError? {
        do {
            // Check file size first to avoid memory issues with large files
            let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
            if let fileSize = attributes[.size] as? Int64, fileSize > maxPDFSize {
                return .fileTooLarge(size: fileSize, limit: maxPDFSize)
            }
            
            // Check if it's a valid PDF by examining the header
            let fileHandle = try FileHandle(forReadingFrom: url)
            defer { fileHandle.closeFile() }
            
            // Read the first chunk to check PDF signature
            let headerData = fileHandle.readData(ofLength: min(1024, Int(attributes[.size] as? Int64 ?? 0)))
            if let headerString = String(data: headerData, encoding: .ascii) {
                if !headerString.hasPrefix("%PDF-") {
                    return .fileNotPDF
                }
            }
        }  catch {
            print("Error diagnosing PDF: \(error.localizedDescription)")
            return .internalError(error)
        }
        
        return nil
    }
}
