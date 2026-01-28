package api

import (
	"bytes"
	"encoding/csv"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/looplj/axonhub/internal/contexts"
	"github.com/looplj/axonhub/internal/ent"
	"github.com/looplj/axonhub/internal/ent/rechargerecord"
	"github.com/looplj/axonhub/internal/ent/redemptioncode"
	"github.com/looplj/axonhub/internal/pkg/redemption"
	"go.uber.org/fx"
)

type RedemptionHandlers struct {
	service *redemption.RedemptionService
	client  *ent.Client
}

type RedemptionHandlersParams struct {
	fx.In
	Service *redemption.RedemptionService
	Client  *ent.Client
}

func NewRedemptionHandlers(params RedemptionHandlersParams) *RedemptionHandlers {
	return &RedemptionHandlers{
		service: params.Service,
		client:  params.Client,
	}
}

type GenerateRequest struct {
	Count     int        `json:"count" binding:"required,min=1"`
	Quota     int        `json:"quota" binding:"required,min=1"`
	MaxUses   *int       `json:"max_uses"`
	ExpiresAt *time.Time `json:"expires_at"`
	Export    bool       `json:"export"`
}

func (h *RedemptionHandlers) GenerateCodes(c *gin.Context) {
	if _, ok := requireOwner(c); !ok {
		return
	}

	var req GenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	codes, err := h.service.GenerateCodes(c.Request.Context(), req.Count, req.Quota, req.ExpiresAt, req.MaxUses)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if req.Export {
		payload, err := exportCodesCSV(codes, req.Quota, req.ExpiresAt, req.MaxUses)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.Header("Content-Type", "application/vnd.ms-excel")
		c.Header("Content-Disposition", "attachment; filename=redemption_codes.csv")
		c.Data(http.StatusOK, "application/vnd.ms-excel", payload)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": codes})
}

type RedeemRequest struct {
	Code string `json:"code" binding:"required"`
}

func (h *RedemptionHandlers) RedeemCode(c *gin.Context) {
	var req RedeemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, ok := requireUser(c)
	if !ok {
		return
	}

	projectID, ok := contexts.GetProjectID(c.Request.Context())
	if !ok || projectID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project id missing in context"})
		return
	}

	quota, err := h.service.RedeemCode(c.Request.Context(), projectID, user.ID, req.Code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}) // Often 400 if code invalid
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "quota": quota})
}

func (h *RedemptionHandlers) ListCodes(c *gin.Context) {
	if _, ok := requireOwner(c); !ok {
		return
	}

	query := h.client.RedemptionCode.Query()

	if code := c.Query("code"); code != "" {
		query = query.Where(redemptioncode.CodeContains(code))
	}
	if status := c.Query("status"); status != "" {
		query = query.Where(redemptioncode.StatusEQ(redemptioncode.Status(status)))
	}
	if voided := c.Query("voided"); voided != "" {
		if value, err := strconv.ParseBool(voided); err == nil {
			query = query.Where(redemptioncode.VoidedEQ(value))
		}
	}
	if usedBy := c.Query("used_by"); usedBy != "" {
		if id, err := strconv.Atoi(usedBy); err == nil {
			query = query.Where(redemptioncode.UsedByEQ(id))
		}
	}
	if expired := c.Query("expired"); expired != "" {
		if value, err := strconv.ParseBool(expired); err == nil {
			if value {
				query = query.Where(redemptioncode.ExpiresAtLTE(time.Now()))
			} else {
				query = query.Where(redemptioncode.Or(
					redemptioncode.ExpiresAtIsNil(),
					redemptioncode.ExpiresAtGT(time.Now()),
				))
			}
		}
	}

	limit := parseLimit(c.Query("limit"), 100)
	offset := parseOffset(c.Query("offset"))

	total, err := query.Clone().Count(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	codes, err := query.
		Order(ent.Desc(redemptioncode.FieldCreatedAt)).
		Limit(limit).
		Offset(offset).
		All(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    codes,
		"pagination": PaginationResponse{
			Total:  total,
			Offset: offset,
			Limit:  limit,
		},
	})
}

type VoidCodeRequest struct {
	Reason string `json:"reason"`
}

func (h *RedemptionHandlers) VoidCode(c *gin.Context) {
	if _, ok := requireOwner(c); !ok {
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	_, err = h.client.RedemptionCode.UpdateOneID(id).
		SetVoided(true).
		SetStatus(redemptioncode.StatusDisabled).
		Save(c.Request.Context())
	if ent.IsNotFound(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "redemption code not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

type DeleteCodesRequest struct {
	IDs []int `json:"ids" binding:"required,min=1"`
}

func (h *RedemptionHandlers) DeleteCodes(c *gin.Context) {
	if _, ok := requireOwner(c); !ok {
		return
	}

	var req DeleteCodesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := h.client.RedemptionCode.Delete().
		Where(redemptioncode.IDIn(req.IDs...)).
		Exec(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *RedemptionHandlers) ListRechargesAdmin(c *gin.Context) {
	if _, ok := requireOwner(c); !ok {
		return
	}

	query := h.client.RechargeRecord.Query()
	if userID := c.Query("user_id"); userID != "" {
		if id, err := strconv.Atoi(userID); err == nil {
			query = query.Where(rechargerecord.UserID(id))
		}
	}
	if projectID := c.Query("project_id"); projectID != "" {
		if id, err := strconv.Atoi(projectID); err == nil {
			query = query.Where(rechargerecord.ProjectID(id))
		}
	}
	if codeID := c.Query("code_id"); codeID != "" {
		if id, err := strconv.Atoi(codeID); err == nil {
			query = query.Where(rechargerecord.CodeID(id))
		}
	}
	if status := c.Query("status"); status != "" {
		query = query.Where(rechargerecord.StatusEQ(rechargerecord.Status(status)))
	}

	limit := parseLimit(c.Query("limit"), 100)
	offset := parseOffset(c.Query("offset"))

	total, err := query.Clone().Count(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	records, err := query.
		Order(ent.Desc(rechargerecord.FieldCreatedAt)).
		Limit(limit).
		Offset(offset).
		All(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    records,
		"pagination": PaginationResponse{
			Total:  total,
			Offset: offset,
			Limit:  limit,
		},
	})
}

func (h *RedemptionHandlers) ListUserRecharges(c *gin.Context) {
	if _, ok := requireUser(c); !ok {
		return
	}

	projectID, ok := contexts.GetProjectID(c.Request.Context())
	if !ok || projectID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project id missing in context"})
		return
	}

	limit := parseLimit(c.Query("limit"), 100)
	offset := parseOffset(c.Query("offset"))

	query := h.client.RechargeRecord.Query().
		Where(rechargerecord.ProjectID(projectID))
	total, err := query.Clone().Count(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	records, err := query.
		Order(ent.Desc(rechargerecord.FieldCreatedAt)).
		Limit(limit).
		Offset(offset).
		All(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    records,
		"pagination": PaginationResponse{
			Total:  total,
			Offset: offset,
			Limit:  limit,
		},
	})
}

func exportCodesCSV(codes []string, quota int, expiresAt *time.Time, maxUses *int) ([]byte, error) {
	buffer := &bytes.Buffer{}
	writer := csv.NewWriter(buffer)
	defer writer.Flush()

	if err := writer.Write([]string{"code", "quota", "expires_at", "max_uses"}); err != nil {
		return nil, err
	}

	expires := ""
	if expiresAt != nil {
		expires = expiresAt.Format(time.RFC3339)
	}
	maxUsesValue := ""
	if maxUses != nil {
		maxUsesValue = strconv.Itoa(*maxUses)
	}

	for _, code := range codes {
		record := []string{code, strconv.Itoa(quota), expires, maxUsesValue}
		if err := writer.Write(record); err != nil {
			return nil, err
		}
	}

	return buffer.Bytes(), nil
}

func parseLimit(value string, fallback int) int {
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}

func parseOffset(value string) int {
	if value == "" {
		return 0
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 0 {
		return 0
	}
	return parsed
}
