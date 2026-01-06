package auth

// LoginRequest represents login request
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Role     string `json:"role" validate:"required,oneof=admin dosen mahasiswa"`
}

// RegisterRequest represents register request
type RegisterRequest struct {
	Email                string `json:"email" validate:"required,email"`
	Password             string `json:"password" validate:"required,min=6"`
	PasswordConfirmation string `json:"password_confirmation" validate:"required,eqfield=Password"`
	Name                 string `json:"name" validate:"required,min=2"`
	Role                 string `json:"role" validate:"required,oneof=dosen mahasiswa"`
	NimNip               string `json:"nim_nip" validate:"required"`
	Phone                string `json:"phone"`
}

// RefreshRequest represents refresh token request
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// LogoutRequest represents logout request
type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// UserDTO represents user data
type UserDTO struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Role      string `json:"role"`
	NimNip    string `json:"nim_nip,omitempty"`
	Phone     string `json:"phone,omitempty"`
	AvatarURL string `json:"avatar_url,omitempty"`
	Status    string `json:"status,omitempty"`
}

// TokenDTO represents token data
type TokenDTO struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

// LoginResponse represents login response
type LoginResponse struct {
	User   UserDTO  `json:"user"`
	Tokens TokenDTO `json:"tokens"`
}

// RefreshResponse represents refresh token response
type RefreshResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}
