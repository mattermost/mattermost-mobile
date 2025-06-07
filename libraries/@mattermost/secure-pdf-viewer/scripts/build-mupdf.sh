#!/bin/bash

# MuPDF Build Script for Android
# Builds both native libraries (.so) and Java JAR

set -e  # Exit on any error

# Determine script and project directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# MuPDF version to build
MUPDF_VERSION="1.26.1"

# Define cache and output directories
CACHE_DIR="$PROJECT_ROOT/.mupdf-cache"
MUPDF_DIR="$CACHE_DIR/mupdf-$MUPDF_VERSION"
LIBS_OUTPUT_DIR="$PROJECT_ROOT/android/libs"
JNI_LIBS_DIR="$PROJECT_ROOT/android/src/main/jniLibs"

# Define colors for output messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging helper functions
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites: NDK, Java, make, git
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Determine NDK location
    if [ -z "$ANDROID_NDK_HOME" ] && [ -z "$NDK_ROOT" ]; then
        if [ -d "$ANDROID_NDK" ]; then
            # Use latest available NDK version
            NDK_VERSION=$(ls "$ANDROID_NDK" | sort -V | tail -n 1)
            export ANDROID_NDK_HOME="$ANDROID_NDK/$NDK_VERSION"
            log_info "Found NDK at: $ANDROID_NDK_HOME"
        else
            log_error "Android NDK not found. Please set ANDROID_NDK_HOME or install NDK"
            exit 1
        fi
    elif [ -n "$NDK_ROOT" ] && [ -z "$ANDROID_NDK_HOME" ]; then
        export ANDROID_NDK_HOME="$NDK_ROOT"
    fi

    # Set NDK_ROOT if not set
    if [ -z "$NDK_ROOT" ]; then
        [ -n "$ANDROID_NDK_ROOT" ] && export NDK_ROOT="$ANDROID_NDK_ROOT"
        [ -n "$ANDROID_NDK_HOME" ] && export NDK_ROOT="$ANDROID_NDK_HOME"
    fi

    # Check if essential tools are available
    for tool in java make git; do
        if ! command -v $tool &> /dev/null; then
            log_error "$tool not found. Please install $tool"
            exit 1
        fi
    done

    # Verify NDK installation structure
    if [ ! -f "$NDK_ROOT/ndk-build" ]; then
        log_error "Invalid NDK installation. ndk-build not found in $NDK_ROOT"
        exit 1
    fi

    log_info "Prerequisites check passed"
    log_info "Using NDK: $NDK_ROOT"
}

# Download and prepare MuPDF source code
prepare_mupdf_source() {
    log_info "Preparing MuPDF source..."

    mkdir -p "$CACHE_DIR"  # Ensure cache directory exists

    if [ -d "$CACHE_DIR/mupdf-$MUPDF_VERSION" ]; then
        log_info "Found cached MuPDF source"
        return  # Skip download if cached source exists
    fi

    # Clone MuPDF repository
    log_info "Cloning MuPDF repository..."
    git clone --recursive --branch "$MUPDF_VERSION" https://github.com/ArtifexSoftware/mupdf.git "$MUPDF_DIR"

    cd "$MUPDF_DIR"

    # Initialize submodules
    log_info "Initializing git submodules..."
    git submodule update --init --recursive

    log_info "MuPDF source prepared"
}

# Build native Android libraries
build_android_libs() {
    log_info "Building Android native libraries..."

    cd "$MUPDF_DIR"

    # Determine JAVA_HOME if not already set
    export JAVA_HOME="${JAVA_HOME:-$(dirname $(dirname $(readlink -f $(which java))))}"

    # Clean previous builds
    make clean || true

    # Build for all Android ABIs
    make android

    # Verify build output
    if [ ! -d "build/android" ]; then
        log_error "Android build failed - build/android directory not found"
        exit 1
    fi

    log_info "Android native libraries built successfully"
}

# Build Java JAR
build_java_jar() {
    log_info "Building Java JAR file..."

    cd "$MUPDF_DIR"

    # Build Java bindings
    make java

    # Verify JAR output
    if [ ! -f "build/java/release/libmupdf.jar" ]; then
        log_error "Java build failed - libmupdf.jar not found"
        exit 1
    fi

    log_info "Java JAR built successfully"
}

# Copy build artifacts (JAR and .so) into project structure
copy_artifacts_to_project() {
    log_info "Copying build artifacts to project..."

    mkdir -p "$LIBS_OUTPUT_DIR"
    mkdir -p "$JNI_LIBS_DIR"

    # Copy JAR
    cp "$MUPDF_DIR/build/java/release/libmupdf.jar" "$LIBS_OUTPUT_DIR/mupdf-$MUPDF_VERSION.jar"
    log_info "JAR copied to $LIBS_OUTPUT_DIR/mupdf-$MUPDF_VERSION.jar"

    # Copy native libraries for each ABI
    for abi_dir in "$MUPDF_DIR"/build/android/libs/*; do
        if [ -d "$abi_dir" ]; then
            abi_name=$(basename "$abi_dir")
            target_dir="$JNI_LIBS_DIR/$abi_name"
            mkdir -p "$target_dir"

            # Copy .so files
            find "$abi_dir" -name "*.so" -exec cp {} "$target_dir/" \;

            if [ -n "$(ls -A "$target_dir" 2>/dev/null)" ]; then
                log_info "Native libraries for $abi_name copied to $target_dir"
            else
                log_warn "No .so files found for $abi_name"
            fi
        fi
    done

    log_info "All artifacts copied successfully"
}

# Generate build information summary
create_build_info() {
    local info_file="$LIBS_OUTPUT_DIR/mupdf-build-info.txt"
    cat > "$info_file" << EOF
MuPDF Build Information
======================
Version: $MUPDF_VERSION
Build Date: $(date)
NDK Path: $NDK_VERSION

Files Generated:
- JAR: mupdf-$MUPDF_VERSION.jar
- Native libs in: src/main/jniLibs/

Integration:
Add to app/build.gradle dependencies:
    implementation files('libs/mupdf-$MUPDF_VERSION.jar')
EOF

    log_info "Build info written to $info_file"
}

# Main build sequence
main() {
    log_info "Starting MuPDF build process for version $MUPDF_VERSION..."
    check_prerequisites
    prepare_mupdf_source
    build_android_libs
    build_java_jar
    copy_artifacts_to_project
    create_build_info
    log_info "MuPDF build completed successfully!"
    log_info "JAR: $LIBS_OUTPUT_DIR/mupdf-$MUPDF_VERSION.jar"
    log_info "Native libs: $JNI_LIBS_DIR"
}

# Clean build artifacts
clean() {
    log_info "Cleaning MuPDF build artifacts..."
    rm -rf "$MUPDF_DIR"
    rm -f "$LIBS_OUTPUT_DIR"/mupdf-*.jar
    rm -f "$LIBS_OUTPUT_DIR/mupdf-build-info.txt"
    rm -rf "$JNI_LIBS_DIR"
    log_info "Clean completed"
}

# Handle script commands
case "${1:-build}" in
    "build") main ;; # Default: full build
    "clean") clean ;; # Clean build artifacts
    "android-only") check_prerequisites; prepare_mupdf_source; build_android_libs; copy_artifacts_to_project; log_info "Android libraries build completed" ;;
    "java-only") check_prerequisites; prepare_mupdf_source; build_java_jar; copy_artifacts_to_project; log_info "Java JAR build completed" ;;
    "help") echo "Usage: $0 [build|clean|android-only|java-only|help]";;
    *) log_error "Unknown command: $1"; exit 1 ;;
esac
