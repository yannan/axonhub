package orchestrator

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/looplj/axonhub/internal/contexts"
	"github.com/looplj/axonhub/internal/llm"
	"github.com/looplj/axonhub/internal/llm/pipeline"
	"github.com/looplj/axonhub/internal/llm/pipeline/stream"
	"github.com/looplj/axonhub/internal/llm/transformer"
	"github.com/looplj/axonhub/internal/log"
	"github.com/looplj/axonhub/internal/objects"
	"github.com/looplj/axonhub/internal/pkg/filter"
	"github.com/looplj/axonhub/internal/pkg/httpclient"
	"github.com/looplj/axonhub/internal/pkg/streams"
	"github.com/looplj/axonhub/internal/pkg/xcontext"
	"github.com/looplj/axonhub/internal/server/biz"
)

func NewChatCompletionOrchestrator(
	channelService *biz.ChannelService,
	modelService *biz.ModelService,
	requestService *biz.RequestService,
	httpClient *httpclient.HttpClient,
	inbound transformer.Inbound,
	systemService *biz.SystemService,
	settingsService *biz.SettingsService,
	usageLogService *biz.UsageLogService,
	validationEngine *filter.ValidationEngine,
) *ChatCompletionOrchestrator {
	connectionTracker := NewDefaultConnectionTracker(256)

	// Build strategies
	strategies := []LoadBalanceStrategy{
		NewTraceAwareStrategy(requestService),                         // Priority 1: Last successful channel from trace
		NewErrorAwareStrategy(channelService),                         // Priority 2: Health and error rate
		NewWeightRoundRobinStrategy(channelService),                   // Priority 3: Weight round robin
		NewConnectionAwareStrategy(channelService, connectionTracker), // Priority 4: Connection count
	}

	adaptiveLoadBalancer := NewLoadBalancer(systemService, strategies...)
	weightedLoadBalancer := NewLoadBalancer(systemService, NewWeightStrategy())

	return &ChatCompletionOrchestrator{
		Inbound:          inbound,
		RequestService:   requestService,
		ChannelService:   channelService,
		SystemService:    systemService,
		SettingsService:  settingsService,
		UsageLogService:  usageLogService,
		ValidationEngine: validationEngine,
		Middlewares: []pipeline.Middleware{
			stream.EnsureUsage(),
		},
		PipelineFactory:      pipeline.NewFactory(httpClient),
		channelSelector:      NewDefaultSelector(channelService, modelService, systemService),
		selectedChannelIds:   []int{},
		connectionTracker:    connectionTracker,
		adaptiveLoadBalancer: adaptiveLoadBalancer,
		weightedLoadBalancer: weightedLoadBalancer,
		proxy:                nil,
	}
}

type ChatCompletionOrchestrator struct {
	Inbound          transformer.Inbound
	RequestService   *biz.RequestService
	ChannelService   *biz.ChannelService
	SystemService    *biz.SystemService
	SettingsService  *biz.SettingsService
	UsageLogService  *biz.UsageLogService
	Middlewares      []pipeline.Middleware
	PipelineFactory  *pipeline.Factory
	Internal         func(*gin.Context)
	ValidationEngine *filter.ValidationEngine

	// The runtime fields.

	// The default channel selector.
	channelSelector CandidateSelector
	// The runtime selected channel ids.
	selectedChannelIds []int
	// The load balancer for channel load balancing.
	adaptiveLoadBalancer *LoadBalancer
	weightedLoadBalancer *LoadBalancer
	// The connection tracker for connection aware load balancing.
	connectionTracker ConnectionTracker

	// proxy is the proxy configuration for testing
	// If set, it will override the channel's default proxy configuration
	proxy *objects.ProxyConfig
}

func (processor *ChatCompletionOrchestrator) WithChannelSelector(selector CandidateSelector) *ChatCompletionOrchestrator {
	c := *processor
	c.channelSelector = selector

	return &c
}

func (processor *ChatCompletionOrchestrator) WithAllowedChannels(allowedChannelIDs []int) *ChatCompletionOrchestrator {
	c := *processor
	c.channelSelector = WithSelectedChannelsSelector(processor.channelSelector, allowedChannelIDs)

	return &c
}

func (processor *ChatCompletionOrchestrator) WithProxy(proxy *objects.ProxyConfig) *ChatCompletionOrchestrator {
	c := *processor
	c.proxy = proxy

	return &c
}

type ChatCompletionResult struct {
	ChatCompletion       *httpclient.Response
	ChatCompletionStream streams.Stream[*httpclient.StreamEvent]
}

func (processor *ChatCompletionOrchestrator) Process(ctx context.Context, request *httpclient.Request) (ChatCompletionResult, error) {
	apiKey, _ := contexts.GetAPIKey(ctx)
	user, _ := contexts.GetUser(ctx)

	// Get retry policy from system settings
	retryPolicy := processor.SystemService.RetryPolicyOrDefault(ctx)

	if log.DebugEnabled(ctx) {
		log.Debug(ctx, "chat request received",
			log.String("request_body", string(request.Body)),
			log.Any("request_headers", request.Headers),
			log.Any("retry_policy", retryPolicy),
		)
	}

	loadBalancer := processor.adaptiveLoadBalancer

	switch retryPolicy.LoadBalancerStrategy {
	case "adaptive":
		loadBalancer = processor.adaptiveLoadBalancer
	case "weighted":
		loadBalancer = processor.weightedLoadBalancer
	default:
		// Default to adaptive load balancer
	}

	state := &PersistenceState{
		APIKey:              apiKey,
		User:                user,
		RequestService:      processor.RequestService,
		UsageLogService:     processor.UsageLogService,
		ChannelService:      processor.ChannelService,
		RetryPolicyProvider: processor.SystemService,
		CandidateSelector:   processor.channelSelector,
		LoadBalancer:        loadBalancer,
		ModelMapper:         NewModelMapper(),
		Proxy:               processor.proxy,
		CandidateIndex:      0,
	}

	var pipelineOpts []pipeline.Option

	// Only apply retry if policy is enabled
	if retryPolicy.Enabled {
		pipelineOpts = append(pipelineOpts, pipeline.WithRetry(
			retryPolicy.MaxChannelRetries,
			retryPolicy.MaxSingleChannelRetries,
			time.Duration(retryPolicy.RetryDelayMs)*time.Millisecond,
		))
	}

	var middlewares []pipeline.Middleware

	// Add global middlewares
	middlewares = append(middlewares, processor.Middlewares...)

	inbound, outbound := NewPersistentTransformers(state, processor.Inbound)

	// Add inbound middlewares (executed after inbound.TransformRequest)
	middlewares = append(middlewares,
		checkApiKeyModelAccess(inbound),
		applyApiKeyModelMapping(inbound),
		selectCandidates(inbound),
		persistRequest(inbound),
		validateContent(inbound, processor.ValidationEngine, processor.SettingsService),
	)

	// Add outbound middlewares (executed after outbound.TransformRequest)
	middlewares = append(middlewares,
		applyOverrideRequestBody(outbound),
		applyOverrideRequestHeaders(outbound),

		// Unified performance tracking middleware.
		withPerformanceRecording(outbound),

		// The request execution middleware must be the final middleware
		// to ensure that the request execution is created with the correct request bodys.
		persistRequestExecution(outbound),

		// Connection tracking middleware for load balancing.
		withConnectionTracking(outbound, processor.connectionTracker),
	)

	pipelineOpts = append(pipelineOpts, pipeline.WithMiddlewares(middlewares...))

	pipe := processor.PipelineFactory.Pipeline(
		inbound,
		outbound,
		pipelineOpts...,
	)

	result, err := pipe.Process(ctx, request)
	if err != nil {
		persistCtx, cancel := xcontext.DetachWithTimeout(ctx, time.Second*10)
		defer cancel()

		// Update the last request execution status based on error if it exists
		// This ensures that when retry fails completely, the last execution is properly marked
		if requestExec := outbound.GetRequestExecution(); requestExec != nil {
			if updateErr := processor.RequestService.UpdateRequestExecutionStatusFromError(
				persistCtx,
				requestExec.ID,
				err,
			); updateErr != nil {
				log.Warn(persistCtx, "Failed to update request execution status from error", log.Cause(updateErr))
			}
		}

		// Update the main request status based on error
		if request := outbound.GetRequest(); request != nil {
			if updateErr := processor.RequestService.UpdateRequestStatusFromError(
				persistCtx,
				request.ID,
				err,
			); updateErr != nil {
				log.Warn(persistCtx, "Failed to update request status from error", log.Cause(updateErr))
			}
		}

		return ChatCompletionResult{}, err
	}

	// Return result based on stream type
	if result.Stream {
		return ChatCompletionResult{
			ChatCompletion:       nil,
			ChatCompletionStream: result.EventStream,
		}, nil
	}

	return ChatCompletionResult{
		ChatCompletion:       result.Response,
		ChatCompletionStream: nil,
	}, nil
}

func validateContent(inbound transformer.Inbound, engine *filter.ValidationEngine, settingsService *biz.SettingsService) pipeline.Middleware {
	return pipeline.OnRawRequest("validate-content", func(ctx context.Context, request *httpclient.Request) (*httpclient.Request, error) {
		if settingsService != nil {
			enabled, err := settingsService.ContentSafetyInterceptEnabled(ctx)
			if err != nil {
				log.Warn(ctx, "failed to read content safety intercept setting", log.Cause(err))
			}
			if !enabled {
				return request, nil
			}
		}

		// Skip body check for now or ensure stream bodies are handled.
		// Assuming prompt is in body and body is string-ish.
		if engine != nil {
			if valid, word := engine.Validate(string(request.Body)); !valid {
				return nil, &llm.ResponseError{
					StatusCode: http.StatusBadRequest,
					Detail: llm.ErrorDetail{
						Message: "Request contains sensitive word: " + word,
						Type:    "content_policy_violation",
						Code:    "sensitive_content",
					},
				}
			}
		}
		return request, nil
	})
}
