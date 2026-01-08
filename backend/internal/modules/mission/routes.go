package mission

import (
	"walletpoint/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(app fiber.Router, handler *Handler, jwtManager *middleware.JWTManager) {
	missions := app.Group("/missions", middleware.JWTMiddleware(jwtManager))

	// IMPORTANT: Specific routes MUST come before parameterized routes

	// Get my participations - all authenticated users
	missions.Get("/my/participations", handler.GetMyParticipations)

	// Get my created missions - dosen only
	missions.Get("/my/created", middleware.RequireDosen(), handler.GetMyMissions)

	// List active missions - all users
	missions.Get("", handler.GetActiveList)

	// Get mission detail - must be after /my routes
	missions.Get("/:id", handler.GetByID)

	// Start mission - mahasiswa only (dosen can't participate in missions)
	missions.Post("/:id/start",
		middleware.RequireMahasiswa(),
		handler.StartMission,
	)

	// Submit mission - mahasiswa only
	missions.Post("/:id/submit",
		middleware.RequireMahasiswa(),
		handler.SubmitMission,
	)

	// Dosen routes
	missions.Post("", middleware.RequireDosen(), handler.Create)
	missions.Put("/:id", middleware.RequireDosen(), handler.Update)
	missions.Delete("/:id", middleware.RequireDosen(), handler.Delete)
	missions.Get("/:id/participants", middleware.RequireDosen(), handler.GetParticipants)
	missions.Post("/:id/grade/:userId", middleware.RequireDosen(), handler.GradeMission)
}
