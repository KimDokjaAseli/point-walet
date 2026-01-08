package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Load .env
	godotenv.Load()

	// Get DB config
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "3306")
	user := getEnv("DB_USER", "root")
	password := getEnv("DB_PASSWORD", "")
	dbName := getEnv("DB_NAME", "pointwalletV2")

	// Connect to database
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", user, password, host, port, dbName)
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Failed to connect:", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping:", err)
	}

	fmt.Println("Connected to database:", dbName)

	// Generate password hash
	newPassword := "Password123"
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash password:", err)
	}

	fmt.Println("New password:", newPassword)
	fmt.Println("Hash:", string(hash))

	// Update all users with new password
	result, err := db.Exec("UPDATE users SET password_hash = ?", string(hash))
	if err != nil {
		log.Fatal("Failed to update passwords:", err)
	}

	affected, _ := result.RowsAffected()
	fmt.Printf("Updated %d users with new password\n", affected)

	// List all users
	rows, err := db.Query(`
		SELECT u.id, u.username, u.email, u.full_name, u.is_active, r.name as role_name
		FROM users u
		LEFT JOIN user_roles ur ON u.id = ur.user_id
		LEFT JOIN roles r ON ur.role_id = r.id
		WHERE u.deleted_at IS NULL
	`)
	if err != nil {
		log.Fatal("Failed to query users:", err)
	}
	defer rows.Close()

	fmt.Println("\n=== Users in database ===")
	for rows.Next() {
		var id uint
		var username, email, fullName, roleName sql.NullString
		var isActive bool

		rows.Scan(&id, &username, &email, &fullName, &isActive, &roleName)
		fmt.Printf("ID=%d, Username=%s, Email=%s, Role=%s, Active=%v\n",
			id, username.String, email.String, roleName.String, isActive)
	}

	fmt.Println("\n=== Login credentials ===")
	fmt.Println("Password for ALL users: Password123")
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
