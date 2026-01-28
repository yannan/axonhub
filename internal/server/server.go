package server

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"go.uber.org/fx"

	"github.com/looplj/axonhub/internal/log"
	"github.com/looplj/axonhub/internal/server/api"
	"github.com/looplj/axonhub/internal/server/biz"
	"github.com/looplj/axonhub/internal/server/dependencies"
	"github.com/looplj/axonhub/internal/server/gc"
	"github.com/looplj/axonhub/internal/server/gql"
	"github.com/looplj/axonhub/internal/server/gql/openapi"
	"github.com/looplj/axonhub/internal/server/middleware"
	"github.com/looplj/axonhub/internal/tracing"
)

func New(config Config) *Server {
	if !config.Debug {
		gin.SetMode(gin.ReleaseMode)
	}

	engine := gin.New()
	engine.Use(middleware.Recovery())

	return &Server{
		Config: config,
		Engine: engine,
	}
}

type Server struct {
	*gin.Engine

	Config Config
	server *http.Server
	addr   string
}

func (srv *Server) Run() error {
	log.Info(context.Background(), "run server",
		log.String("name", srv.Config.Name),
		log.String("host", srv.Config.Host),
		log.Int("port", srv.Config.Port),
	)
	addr := fmt.Sprintf("%s:%d", srv.Config.Host, srv.Config.Port)
	srv.server = &http.Server{
		Addr:         addr,
		Handler:      srv.Engine,
		ReadTimeout:  srv.Config.ReadTimeout,
		WriteTimeout: max(srv.Config.RequestTimeout, srv.Config.LLMRequestTimeout),
	}
	srv.addr = addr

	err := srv.server.ListenAndServe()
	if err != nil {
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}

		return err
	}

	return nil
}

func (srv *Server) Shutdown(ctx context.Context) error {
	return srv.server.Shutdown(ctx)
}

func Run(opts ...fx.Option) {
	constructors := []any{
		openapi.NewGraphqlHandlers,
		gql.NewGraphqlHandlers,
		gc.NewWorker,
		New,
	}

	app := fx.New(
		append([]fx.Option{
			fx.Provide(constructors...),
			dependencies.Module,
			biz.Module,
			api.Module,
			fx.Invoke(func(cfg log.Config) {
				fmt.Println("[DEBUG] fx.Invoke: Setting up logging")
				log.SetGlobalConfig(cfg)
				tracing.SetupLogger(log.GetGlobalLogger())
				slog.SetDefault(log.GetGlobalLogger().AsSlog())
				fmt.Println("[DEBUG] fx.Invoke: Logging setup complete")
			}),
			fx.Invoke(func(lc fx.Lifecycle, worker *gc.Worker) {
				fmt.Println("[DEBUG] fx.Invoke: Setting up GC worker lifecycle hooks")
				lc.Append(fx.Hook{
					OnStart: func(ctx context.Context) error {
						fmt.Println("[DEBUG] GC Worker OnStart called")
						err := worker.Start(ctx)
						fmt.Printf("[DEBUG] GC Worker Start returned: %v\n", err)
						return err
					},
					OnStop: func(ctx context.Context) error {
						return worker.Stop(ctx)
					},
				})
			}),
			fx.Invoke(SetupRoutes),
		}, opts...)...,
	)

	fmt.Println("[DEBUG] fx.New() completed, about to call app.Start()")

	if err := app.Start(context.Background()); err != nil {
		fmt.Printf("[DEBUG] app.Start() failed with error: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("[DEBUG] app.Start() completed successfully, waiting for shutdown signal")
	<-app.Wait()

	fmt.Println("[DEBUG] Received shutdown signal, stopping app")
	if err := app.Stop(context.Background()); err != nil {
		fmt.Printf("[DEBUG] app.Stop() failed with error: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("[DEBUG] app.Stop() completed successfully")
}
