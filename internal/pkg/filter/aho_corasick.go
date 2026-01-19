package filter

import (
	"context"
	"encoding/base64"
	"errors"
	"os"

	"github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common"
	"github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common/profile"
	tms "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/tms/v20200713"
)

type ValidationEngine struct {
	client  *tms.Client
	initErr error
}

func NewValidationEngine() *ValidationEngine {
	secretID := os.Getenv("TENCENTCLOUD_SECRET_ID")
	secretKey := os.Getenv("TENCENTCLOUD_SECRET_KEY")
	if secretID == "" || secretKey == "" {
		return &ValidationEngine{initErr: errors.New("missing Tencent Cloud credentials (TENCENTCLOUD_SECRET_ID/TENCENTCLOUD_SECRET_KEY)")}
	}

	var credential *common.Credential
	if token := os.Getenv("TENCENTCLOUD_TOKEN"); token != "" {
		credential = common.NewTokenCredential(secretID, secretKey, token)
	} else {
		credential = common.NewCredential(secretID, secretKey)
	}

	cpf := profile.NewClientProfile()
	cpf.HttpProfile.Endpoint = "tms.tencentcloudapi.com"

	region := os.Getenv("TENCENTCLOUD_REGION")
	client, err := tms.NewClient(credential, region, cpf)
	if err != nil {
		return &ValidationEngine{initErr: err}
	}

	return &ValidationEngine{client: client}
}

func (e *ValidationEngine) Reload(ctx context.Context) error {
	return e.initErr
}

func (e *ValidationEngine) Validate(content string) (bool, string) {
	if e == nil || e.client == nil {
		return true, ""
	}

	if content == "" {
		return true, ""
	}

	encoded := base64.StdEncoding.EncodeToString([]byte(content))
	request := tms.NewTextModerationRequest()
	request.Content = common.StringPtr(encoded)

	response, err := e.client.TextModeration(request)
	if err != nil {
		return true, ""
	}

	if response == nil || response.Response == nil || response.Response.Suggestion == nil {
		return true, ""
	}

	suggestion := *response.Response.Suggestion
	if suggestion == "Pass" {
		return true, ""
	}

	word := firstKeyword(response.Response.Keywords)
	if word == "" && response.Response.Label != nil {
		word = *response.Response.Label
	}
	if word == "" {
		word = "tencent_cloud"
	}

	return false, word
}

func firstKeyword(keywords []*string) string {
	if len(keywords) == 0 || keywords[0] == nil {
		return ""
	}

	return *keywords[0]
}
