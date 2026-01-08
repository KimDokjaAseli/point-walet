package auth

// LoginRequest for login endpoint
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (r *LoginRequest) Validate() []ValidationError {
	var errors []ValidationError
	if r.Username == "" {
		errors = append(errors, ValidationError{Field: "username", Message: "Username is required"})
	}
	if r.Password == "" {
		errors = append(errors, ValidationError{Field: "password", Message: "Password is required"})
	}
	return errors
}

// RefreshTokenRequest for refresh endpoint
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// ChangePasswordRequest for change password endpoint
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
	ConfirmPassword string `json:"confirm_password"`
}

func (r *ChangePasswordRequest) Validate() []ValidationError {
	var errors []ValidationError
	if r.CurrentPassword == "" {
		errors = append(errors, ValidationError{Field: "current_password", Message: "Current password is required"})
	}
	if r.NewPassword == "" {
		errors = append(errors, ValidationError{Field: "new_password", Message: "New password is required"})
	}
	if len(r.NewPassword) < 8 {
		errors = append(errors, ValidationError{Field: "new_password", Message: "New password must be at least 8 characters"})
	}
	if r.NewPassword != r.ConfirmPassword {
		errors = append(errors, ValidationError{Field: "confirm_password", Message: "Passwords do not match"})
	}
	return errors
}

// RegisterRequest for registration
type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
	NimNip   string `json:"nim_nip"`
	Role     string `json:"role"`
}

func (r *RegisterRequest) Validate() []ValidationError {
	var errors []ValidationError
	if r.Username == "" {
		errors = append(errors, ValidationError{Field: "username", Message: "Username is required"})
	}
	if r.Email == "" {
		errors = append(errors, ValidationError{Field: "email", Message: "Email is required"})
	}
	if r.Password == "" {
		errors = append(errors, ValidationError{Field: "password", Message: "Password is required"})
	}
	if len(r.Password) < 8 {
		errors = append(errors, ValidationError{Field: "password", Message: "Password must be at least 8 characters"})
	}
	if r.FullName == "" {
		errors = append(errors, ValidationError{Field: "full_name", Message: "Full name is required"})
	}
	return errors
}

// ValidationError represents a field validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// LoginResponse for login success
type LoginResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int64        `json:"expires_in"`
	TokenType    string       `json:"token_type"`
	User         UserResponse `json:"user"`
}

// UserResponse for user data
type UserResponse struct {
	ID        uint    `json:"id"`
	Username  string  `json:"username"`
	Email     string  `json:"email"`
	FullName  string  `json:"full_name"`
	NimNip    *string `json:"nim_nip,omitempty"`
	Role      string  `json:"role"`
	AvatarURL *string `json:"avatar_url,omitempty"`
}

// ProfileResponse for profile endpoint
type ProfileResponse struct {
	ID              uint    `json:"id"`
	Username        string  `json:"username"`
	Email           string  `json:"email"`
	FullName        string  `json:"full_name"`
	NimNip          *string `json:"nim_nip,omitempty"`
	Phone           *string `json:"phone,omitempty"`
	Role            string  `json:"role"`
	AvatarURL       *string `json:"avatar_url,omitempty"`
	EmailVerifiedAt *string `json:"email_verified_at,omitempty"`
	LastLoginAt     *string `json:"last_login_at,omitempty"`
	CreatedAt       string  `json:"created_at"`
}

// ToUserResponse converts UserWithRole to UserResponse
func ToUserResponse(u *UserWithRole) UserResponse {
	resp := UserResponse{
		ID:       u.ID,
		Username: u.Username,
		Email:    u.Email,
		FullName: u.FullName,
		Role:     u.RoleName,
	}
	if u.NimNip.Valid {
		resp.NimNip = &u.NimNip.String
	}
	if u.AvatarURL.Valid {
		resp.AvatarURL = &u.AvatarURL.String
	}
	return resp
}
