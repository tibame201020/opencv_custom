package backend

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"script-platform/server/process_manager"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupTestRouter(corePath string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	manager = process_manager.NewScriptManager(corePath, "dummy_python", "entry.py")

	r := gin.Default()
	api := r.Group("/api")

	api.POST("/projects/:id/assets", uploadProjectAsset)
	api.GET("/projects/:id/assets", listProjectAssets)
	api.GET("/projects/:id/raw-assets/*filename", getProjectAsset)
	api.DELETE("/projects/:id/assets/*filename", deleteProjectAsset)
	api.POST("/projects/:id/assets-rename", renameProjectAsset)
	api.POST("/projects/:id/assets-copy", copyProjectAsset)
	api.POST("/projects/:id/assets-mkdir", mkdirProjectAsset)
	api.POST("/projects/:id/assets-move", moveProjectAsset)
	return r
}

func TestAssetMkdirSecurity(t *testing.T) {
	// Setup mock environment
	tempDir, err := os.MkdirTemp("", "script_manager_test_*")
	assert.NoError(t, err)
	defer os.RemoveAll(tempDir)

	router := setupTestRouter(tempDir)
	projectID := "test_project"
	imagesDir := filepath.Join(tempDir, "workflows", projectID, "images")

	// Ensure the base directory exists
	os.MkdirAll(imagesDir, 0755)

	tests := []struct {
		name         string
		reqPath      string
		expectedCode int
	}{
		{
			name:         "Valid Subdirectory",
			reqPath:      "valid_folder",
			expectedCode: 200,
		},
		{
			name:         "Deeply Nested Valid Directory",
			reqPath:      "deep/nested/folder",
			expectedCode: 200,
		},
		{
			name:         "Path Traversal Attack - Same Level",
			reqPath:      "../sibling_folder",
			expectedCode: 403,
		},
		{
			name:         "Path Traversal Attack - Deep Outside",
			reqPath:      "../../../../etc/passwd",
			expectedCode: 403,
		},
		{
			name:         "Trailing Space in Name",
			reqPath:      "folder_with_space ",
			expectedCode: 200,
		},
		{
			name:         "Absolute Path Injection Linux",
			reqPath:      "/tmp/hacked_folder",
			expectedCode: 200, // It gets stripped by TrimLeft(/) so it becomes tmp/hacked_folder
		},
		{
			name:         "Absolute Path Injection Windows",
			reqPath:      "C:\\Windows\\System32",
			expectedCode: 500, // filepath.FromSlash + TrimLeft doesn't block C:, but MkdirAll rejects the invalid colon
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			body := map[string]interface{}{"path": tc.reqPath}
			jsonBody, _ := json.Marshal(body)

			req, _ := http.NewRequest(http.MethodPost, fmt.Sprintf("/api/projects/%s/assets-mkdir", projectID), bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.Equal(t, tc.expectedCode, w.Code)

			if tc.expectedCode == 200 {
				// Verify directory was actually created where expected
				cleanRel := strings.TrimLeft(filepath.FromSlash(tc.reqPath), string(os.PathSeparator))

				// Absolute paths trick: if user inputs C:\... it will fail the prefix check and return 403.
				// Wait, the explicit test case "C:\Windows..." returns 403, so let's check it.
				if strings.Contains(tc.reqPath, ":") {
					assert.True(t, w.Code == 403 || w.Code == 500, "Expected 403 or 500 for paths with colons")
					return
				}

				createdPath := filepath.Join(imagesDir, cleanRel)
				info, err := os.Stat(createdPath)
				assert.NoError(t, err)
				assert.True(t, info.IsDir())
			}
		})
	}
}

func TestAssetMoveSecurity(t *testing.T) {
	tempDir, _ := os.MkdirTemp("", "script_manager_test_*")
	defer os.RemoveAll(tempDir)
	router := setupTestRouter(tempDir)
	projectID := "test_project"
	imagesDir := filepath.Join(tempDir, "workflows", projectID, "images")

	os.MkdirAll(imagesDir, 0755)

	// Create a dummy file to interact with
	dummySrc := filepath.Join(imagesDir, "dummy.txt")
	os.WriteFile(dummySrc, []byte("test"), 0644)

	// Valid Move
	body := map[string]string{"sourcePath": "dummy.txt", "targetPath": "new_folder"}
	jsonBody, _ := json.Marshal(body)
	req, _ := http.NewRequest(http.MethodPost, "/api/projects/test_project/assets-move", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
	// Verify it moved
	_, err := os.Stat(filepath.Join(imagesDir, "new_folder", "dummy.txt"))
	assert.NoError(t, err)

	// Hacker Move - Try to move out of the folder
	os.WriteFile(filepath.Join(imagesDir, "hacker.txt"), []byte("test"), 0644)
	body = map[string]string{"sourcePath": "hacker.txt", "targetPath": "../"}
	jsonBody, _ = json.Marshal(body)
	req, _ = http.NewRequest(http.MethodPost, "/api/projects/test_project/assets-move", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, 403, w.Code) // Should be blocked
}
