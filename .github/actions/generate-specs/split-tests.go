package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

type DeviceInfo struct {
	Device    string
	OSVersion string
}

type Specs struct {
	searchPath   string
	directory    string
	parallelism  int
	rawFiles     []string
	groupedFiles []SpecGroup
	deviceInfo   DeviceInfo
}

type SpecGroup struct {
	RunID     string `json:"runId"`
	Specs     string `json:"specs"`
	Device    string `json:"device"`
	OSVersion string `json:"osVersion"`
}

type Output struct {
	Include []SpecGroup `json:"include"`
}

func newSpecGroup(runId string, specs string, deviceInfo DeviceInfo) *SpecGroup {
	return &SpecGroup{
		RunID:     runId,
		Specs:     specs,
		Device:    deviceInfo.Device,
		OSVersion: deviceInfo.OSVersion,
	}
}

func newSpecs(directory string, searchPath string, parallelism int, deviceInfo DeviceInfo) *Specs {
	return &Specs{
		directory:   directory,
		searchPath:  searchPath,
		parallelism: parallelism,
		deviceInfo:  deviceInfo,
	}
}

func (s *Specs) findFiles() {
	fileSystem := os.DirFS(filepath.Join(s.directory, s.searchPath))
	err := fs.WalkDir(fileSystem, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Find all files matching *.e2e.ts
		r := regexp.MustCompile(`.*\.e2e\.ts$`)
		if r.MatchString(path) {
			s.rawFiles = append(s.rawFiles, filepath.Join(s.searchPath, path))
		}

		return nil
	})
	if err != nil {
		panic(err)
	}
}

func (s *Specs) generateSplits() {
	// Split to chunks based on the parallelism provided
	chunkSize := int(math.Ceil(float64(len(s.rawFiles)) / float64(s.parallelism)))
	runNo := 1
	for i := 0; i <= len(s.rawFiles); i += chunkSize {
		end := i + chunkSize
		if end > len(s.rawFiles) {
			end = len(s.rawFiles)
		}
		fileGroup := strings.Join(s.rawFiles[i:end], " ")
		specFileGroup := newSpecGroup(strconv.Itoa(runNo), fileGroup, s.deviceInfo)
		s.groupedFiles = append(s.groupedFiles, *specFileGroup)
		// Break when we reach the end to avoid duplicate groups
		if end == len(s.rawFiles) {
			break
		}
		runNo++
	}
}

func (s *Specs) dumpSplits() {
	// Dump json format for GitHub actions
	o := &Output{
		Include: s.groupedFiles,
	}

	b, err := json.Marshal(o)
	if err != nil {
		panic(err)
	}

	fmt.Println(string(b))
}

func main() {
	searchPath := os.Getenv("SEARCH_PATH")
	directory := os.Getenv("DIRECTORY")
	parallelism, _ := strconv.Atoi(os.Getenv("PARALLELISM"))
	device := os.Getenv("DEVICE")
	osVersion := os.Getenv("OS_VERSION")

	if envDevice, ok := os.LookupEnv("DEVICE"); ok {
		device = envDevice
	} else {
		device = "iPhone 15" // Default device
	}

	if envOSVersion, ok := os.LookupEnv("OS_VERSION"); ok {
		osVersion = envOSVersion
	} else {
		osVersion = "17.2" // Default iOS version
	}

	deviceInfo := DeviceInfo{
		Device:    device,
		OSVersion: osVersion,
	}

	specs := newSpecs(directory, searchPath, parallelism, deviceInfo)
	specs.findFiles()
	specs.generateSplits()
	specs.dumpSplits()
}
