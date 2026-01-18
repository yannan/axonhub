package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/looplj/axonhub/internal/contexts"
	"github.com/looplj/axonhub/internal/ent"
)

func requireUser(c *gin.Context) (*ent.User, bool) {
	user, ok := contexts.GetUser(c.Request.Context())
	if !ok || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return nil, false
	}
	return user, true
}

func requireOwner(c *gin.Context) (*ent.User, bool) {
	user, ok := requireUser(c)
	if !ok {
		return nil, false
	}
	if !user.IsOwner {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return nil, false
	}
	return user, true
}
