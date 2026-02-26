package main

import (
	"CloudCrypt/auth"
	"CloudCrypt/config"
	"CloudCrypt/db"
	"CloudCrypt/handlers"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gopkg.in/natefinch/lumberjack.v2"
)

func checkError(err error) {
	log.Printf("Error: %v", err)
}

func main() {
	db.InitDB()

	// Log Handling
	lj := &lumberjack.Logger{
		Filename:   "logs/server.log", // base file
		MaxSize:    50,                // MB (rotate when it grows past this)
		MaxBackups: 14,                // keep 14 old files
		MaxAge:     365,               // days
		Compress:   true,              // gzip old logs
		// LocalTime: true,            // optional (uses local time in timestamps)
	}
	// Write to both terminal and rotating file
	logwriter := io.MultiWriter(os.Stdout, lj)
	gin.DefaultWriter = logwriter
	gin.DefaultErrorWriter = logwriter

	// router stuff
	router := gin.Default()
	err := config.LoadConfig()
	if err != nil {
		log.Printf("Error loading config: %v", err)
	}
	router.Use(gin.Logger(), gin.Recovery())

	// Simple health check just for my proxy
	router.GET("/health", func(context *gin.Context) {
		context.String(http.StatusOK, "OK")
	})

	router.Use(cors.New(cors.Config{
		AllowOrigins:     config.Conf.AllowedOrigins,
		AllowMethods:     []string{http.MethodGet, http.MethodPut, http.MethodPatch, http.MethodPost, http.MethodHead, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{"Origin", "Content-Type", "X-XSRF-TOKEN", "X-CSRF-TOKEN", "Accept", "Origin", "X-Requested-With", "Authorization", "X-Encryption-Key"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		AllowOriginFunc: func(origin string) bool {
			return origin == config.Conf.API_URL
		},
		MaxAge: 12 * time.Hour,
	}))

	apiGroup := router.Group("/api")
	{
		filesGroup := apiGroup.Group("/files")
		filesGroup.Use(auth.Authorize())
		{
			filesGroup.POST("/upload", handlers.UploadHandler)
			filesGroup.PUT("/uploadchunked", handlers.ChunkedUploadHandler)
			//filesGroup.GET("/download", handlers.DownloadHandler) // Moved to outer scope to bypass CSRF for direct links
			filesGroup.POST("/prepare-download", handlers.PrepareDownloadHandler)
			filesGroup.DELETE("/delete", handlers.DeleteHandler)
			filesGroup.POST("/rename", handlers.RenameHandler)
			filesGroup.POST("/create-folder", handlers.CreateFolderHandler)
			filesGroup.GET("/ls", handlers.ListHandler)
			filesGroup.POST("/copy", handlers.CopyHandler)
			filesGroup.POST("/move", handlers.MoveHandler)
			filesGroup.GET("/usage", handlers.UsageHandler)
		}

		// Download handler (Bypass CSRF MW, uses one-time token)
		apiGroup.GET("/files/download", handlers.DownloadHandler)
		apiGroup.GET("/files/download-folder", handlers.DownloadFolderHandler)

		authGroup := apiGroup.Group("/auth")
		{
			authGroup.POST("/register", auth.RegisterHandler)
			authGroup.POST("/login", auth.LoginHandler)
			authGroup.POST("/logout", auth.LogoutHandler)
			//Signed download handler
			authGroup.GET("/genDLink", auth.GenerateDownloadLink)
			authGroup.GET("/checksession", auth.SessionCheckHandler)
			authGroup.POST("/profile", auth.UpdateProfileHandler)
			authGroup.POST("/avatar", auth.UploadAvatarHandler)
			authGroup.POST("/key-mode", auth.SwapKeyModeHandler)
		}

		shareGroup := apiGroup.Group("/share")
		shareGroup.Use(auth.Authorize())
		{
			shareGroup.POST("/create", handlers.CreateShareHandler)
			shareGroup.GET("/list", handlers.ListSharedFilesHandler)
			shareGroup.DELETE("/:id", handlers.DeleteShareHandler)
		}

		// Public share endpoints
		apiGroup.GET("/share/:id/info", handlers.GetShareInfoHandler)
		apiGroup.GET("/share/:id/download", handlers.DownloadShareHandler)
		apiGroup.POST("/share/:id/download", handlers.DownloadShareHandler)

		// Serve avatars (implement properly later)
		apiGroup.Static("/avatars", "./avatars")

		downloadGroup := apiGroup.Group("/dlink")
		{
			downloadGroup.GET("/generateLink", auth.GenerateDownloadLink)
			downloadGroup.GET("/download", handlers.SignedDownloadHandler)
		}

		apiGroup.GET("/health", func(context *gin.Context) {
			context.JSON(http.StatusOK, gin.H{"online": "OK"})
		})

	}

	apiGroup.OPTIONS("/*path", func(context *gin.Context) {
		context.Status(204)
	})

	/*
		router.Static("/assets", "./dist/assets")


			router.NoRoute(func(context *gin.Context) {
				context.File("./dist/index.html")
			})


		router.GET("/", func(context *gin.Context) {
			context.File("./dist/index.html")
		})
	*/

	//router.MaxMultipartMemory = 4 << 30
	//err = router.RunTLS("10.8.0.2:8443", os.Getenv("SSLPUBLIC"), os.Getenv("SSLPRIVATE"))
	err = router.Run("0.0.0.0:" + config.Conf.Port)
	if err != nil {
		log.Printf("server error: %v", err)
		panic(err)
	}
}
