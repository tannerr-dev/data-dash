package main

import (
	// "database/sql"
	// "encoding/json"
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"html/template"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"google.golang.org/api/oauth2/v2"
	"google.golang.org/api/option"
)

var (
	dashboardTemplate *template.Template
	GoogleClientID    string
	LoginURI          string
	CompanyDomain     string
	JWTSecret         []byte
	IsProduction      bool
	loginAttempts     = make(map[string][]time.Time)
	loginMutex        sync.RWMutex
)

// loadOrGenerateJWTSecret loads an existing JWT secret from file or generates a new one
func loadOrGenerateJWTSecret() ([]byte, error) {
	secretFile := ".jwt_secret"

	// Try to load existing secret from environment variable first
	if secretHex := os.Getenv("JWT_SECRET"); secretHex != "" {
		secret, err := hex.DecodeString(secretHex)
		if err != nil {
			return nil, fmt.Errorf("invalid JWT_SECRET format: %v", err)
		}
		if len(secret) == 32 {
			log.Println("JWT secret loaded from environment variable")
			return secret, nil
		}
		log.Println("JWT_SECRET in environment has incorrect length, generating new one")
	}

	// Try to load existing secret from file
	if _, err := os.Stat(secretFile); err == nil {
		secretHex, err := ioutil.ReadFile(secretFile)
		if err != nil {
			return nil, fmt.Errorf("failed to read JWT secret file: %v", err)
		}

		secret, err := hex.DecodeString(string(secretHex))
		if err != nil {
			log.Printf("Invalid JWT secret in file, generating new one: %v", err)
		} else if len(secret) == 32 {
			log.Println("JWT secret loaded from file")
			return secret, nil
		} else {
			log.Println("JWT secret in file has incorrect length, generating new one")
		}
	}

	// Generate new secret
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return nil, fmt.Errorf("failed to generate JWT secret: %v", err)
	}

	// Save to file for future use
	secretHex := hex.EncodeToString(secret)
	if err := ioutil.WriteFile(secretFile, []byte(secretHex), 0600); err != nil {
		log.Printf("Warning: failed to save JWT secret to file: %v", err)
	} else {
		log.Println("New JWT secret generated and saved to file")
	}

	return secret, nil
}

// Initialize templates and JWT secret
func init() {
	// Load .env file, this mergest .env into the os env variables
	if err := godotenv.Load(); err != nil {
		log.Printf("No .env file found or failed to load: %v", err)
	}
	if os.Getenv("ENV") == "PRODUCTION" {
		log.Println("PRODUCTION mode")
		GoogleClientID = "342815594579-ggh0eet7138jdutu0qqkgndg390vqlcj.apps.googleusercontent.com"
		LoginURI = "https://data.tannerr.com/api/login"
	} else {
		log.Println("DEVELOPMENT mode")
		GoogleClientID = "342815594579-hdrs2ntk9k6g4obh9ucclrhnqsi0p19c.apps.googleusercontent.com"
		LoginURI = "http://localhost:8080/api/login"
	}
	CompanyDomain = os.Getenv("COMPANY_DOMAIN")
	fmt.Println(CompanyDomain)
	var err error
	fmt.Println("loading templates...")
	dashboardTemplate, err = template.ParseFiles("templates/dashboard.html")

	if err != nil {
		log.Fatalf("Error parsing templates: %v", err)
	}

	if err != nil {
		log.Fatalf("Error parsing dashboard template: %v", err)
	}

	// Detect production environment
	IsProduction = os.Getenv("ENV") == "PRODUCTION" || os.Getenv("HTTPS") == "true"

	// Load or generate JWT secret
	JWTSecret, err = loadOrGenerateJWTSecret()
	if err != nil {
		log.Fatalf("Error loading/generating JWT secret: %v", err)
	}
	// log.Printf("JWT Secret: %s", hex.EncodeToString(JWTSecret))
	log.Printf("Production mode: %v", IsProduction)
	// log.Printf("GoogleClientID: %s", GoogleClientID)
}

// SecurityHeadersConfig defines configuration for security and caching headers
type SecurityHeadersConfig struct {
	EnableCaching bool
	CacheMaxAge   int
}

// securityHeadersMiddleware sets security headers and optional caching headers
func securityHeadersMiddleware(config SecurityHeadersConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Security headers
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "DENY")
			w.Header().Set("X-XSS-Protection", "1; mode=block")
			w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")

			// HTTPS-only headers in production
			if IsProduction {
				w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
			}

			// Cache headers
			if config.EnableCaching && config.CacheMaxAge > 0 {
				w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d, must-revalidate", config.CacheMaxAge))
			} else {
				w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
				w.Header().Set("Pragma", "no-cache")
				w.Header().Set("Expires", "0")
			}

			next.ServeHTTP(w, r)
		})
	}
}

// Helper functions for common middleware configurations
func securityHeaders() func(http.Handler) http.Handler {
	return securityHeadersMiddleware(SecurityHeadersConfig{EnableCaching: false})
}

func securityHeadersWithCaching(maxAge int) func(http.Handler) http.Handler {
	return securityHeadersMiddleware(SecurityHeadersConfig{EnableCaching: true, CacheMaxAge: maxAge})
}

func checkRateLimit(ip string) bool {
	loginMutex.Lock()
	defer loginMutex.Unlock()

	now := time.Now()
	attempts := loginAttempts[ip]

	// Remove attempts older than 15 minutes
	var recentAttempts []time.Time
	for _, attempt := range attempts {
		if now.Sub(attempt) < 15*time.Minute {
			recentAttempts = append(recentAttempts, attempt)
		}
	}

	// Allow max 5 attempts per 15 minutes
	if len(recentAttempts) >= 5 {
		return false
	}

	// Add current attempt
	recentAttempts = append(recentAttempts, now)
	loginAttempts[ip] = recentAttempts

	return true
}

func verifyGoogleToken(idToken string) (*oauth2.Tokeninfo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	oauth2Service, err := oauth2.NewService(ctx, option.WithoutAuthentication())
	if err != nil {
		return nil, fmt.Errorf("failed to create oauth2 service: %v", err)
	}

	tokenInfoCall := oauth2Service.Tokeninfo()
	tokenInfoCall.IdToken(idToken)

	tokenInfo, err := tokenInfoCall.Do()
	if err != nil {
		return nil, fmt.Errorf("failed to verify token: %v", err)
	}

	// Verify the audience (your client ID)
	expectedAudience := GoogleClientID
	if tokenInfo.Audience != expectedAudience {
		return nil, fmt.Errorf("invalid audience: got %s, expected %s",
			tokenInfo.Audience, expectedAudience)
	}

	// Verify the issued_to field (should match client ID for additional security)
	if tokenInfo.IssuedTo != expectedAudience {
		return nil, fmt.Errorf("invalid issued_to: got %s, expected %s",
			tokenInfo.IssuedTo, expectedAudience)
	}

	// Verify token expiration
	if tokenInfo.ExpiresIn <= 0 {
		return nil, fmt.Errorf("token has expired")
	}

	// Verify email domain (G Suite only)
	if tokenInfo.Email == "" {
		return nil, fmt.Errorf("no email in token")
	}

	// Check if COMPANY_DOMAIN is set
	if CompanyDomain == "" {
		return nil, fmt.Errorf("COMPANY_DOMAIN not configured")
	}

	// If COMPANY_DOMAIN starts with @, treat it as domain-based auth
	if strings.HasPrefix(CompanyDomain, "@") {
		// Extract domain from email
		emailParts := strings.Split(tokenInfo.Email, "@")
		if len(emailParts) != 2 {
			return nil, fmt.Errorf("invalid email format")
		}
		expectedDomain := CompanyDomain[1:] // Remove @ prefix
		if emailParts[1] != expectedDomain {
			return nil, fmt.Errorf("invalid domain: got %s, expected %s", emailParts[1], expectedDomain)
		}
	} else {
		// Exact email match
		if tokenInfo.Email != CompanyDomain {
			return nil, fmt.Errorf("invalid email: got %s, expected %s", tokenInfo.Email, CompanyDomain)
		}
	}

	return tokenInfo, nil
}

// JWT Claims structure
type Claims struct {
	Email string `json:"email"`
	jwt.RegisteredClaims
}

// Generate JWT token for authenticated user
func generateJWT(email string) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		Email: email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JWTSecret)
}

// Validate JWT token
func validateJWT(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return JWTSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}

func createSecureCookie(name, value string, maxAge int) *http.Cookie {
	return &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   IsProduction, // Only secure in production (HTTPS)
		SameSite: http.SameSiteLaxMode,
	}
}

func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get token from cookie
		cookie, err := r.Cookie("auth_token")
		if err != nil {
			http.Redirect(w, r, "/", http.StatusSeeOther)
			return
		}

		// Validate token
		claims, err := validateJWT(cookie.Value)
		if err != nil {
			http.Redirect(w, r, "/", http.StatusSeeOther)
			return
		}

		// Add user info to request context
		ctx := context.WithValue(r.Context(), "user_email", claims.Email)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func loginApiHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("login endpoint hit")

	// Rate limiting check
	clientIP := r.RemoteAddr
	if !checkRateLimit(clientIP) {
		http.Error(w, "Too many login attempts. Please try again later.", http.StatusTooManyRequests)
		return
	}

	csrf_token_cookie, err := r.Cookie("g_csrf_token")
	if err != nil {
		fmt.Println("error getting cookie")
	}
	fmt.Printf("%s\n", csrf_token_cookie.Value)
	if err := r.ParseForm(); err != nil {
		fmt.Println("error parsing form")
	}
	csrf_token_body := r.Form.Get("g_csrf_token")
	if csrf_token_body == "" {
		fmt.Println("no csrf in post body")
	}
	fmt.Println("csrf token:")
	fmt.Println(csrf_token_body)

	if csrf_token_cookie.Value != csrf_token_body {
		fmt.Println("csrf values do not match")
	} else {
		fmt.Println("csrf values match!")
	}

	cred := r.Form.Get("credential")
	if cred == "" {
		fmt.Println("empty credentials or no credential value?")
	}
	// fmt.Println(cred)

	tokenInfo, err := verifyGoogleToken(cred)
	if err != nil {
		fmt.Printf("Token verification failed: %v\n", err)
		if strings.Contains(err.Error(), "invalid domain") {
			http.Error(w, "Access denied.", http.StatusForbidden)
		} else if strings.Contains(err.Error(), "token has expired") {
			http.Error(w, "Authentication failed: Token expired", http.StatusUnauthorized)
		} else {
			http.Error(w, "Authentication failed: Invalid credentials", http.StatusUnauthorized)
		}
		return
	}
	jwtToken, err := generateJWT(tokenInfo.Email)
	if err != nil {
		fmt.Printf("JWT generation failed: %v\n", err)
		http.Error(w, "Session creation failed", http.StatusInternalServerError)
		return
	}
	http.SetCookie(w, createSecureCookie("auth_token", jwtToken, 86400)) // 24 hours
	fmt.Printf("Login successful for user: %s\n", tokenInfo.Email)
	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
}

func userInfoHandler(w http.ResponseWriter, r *http.Request) {
	userEmail := r.Context().Value("user_email").(string)
	fmt.Fprintf(w, "Authenticated user: %s", userEmail)
}

func logoutApiHandler(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, createSecureCookie("auth_token", "", -1)) // Delete cookie
	fmt.Println("User logged out")
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

type TemplateData struct {
	ClientID string
	URI      string
}

func htmlxLoginApiHandler(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("templates/htmxLogin.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	data := TemplateData{
		ClientID: GoogleClientID,
		URI:      LoginURI,
	}
	err = tmpl.Execute(w, data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func monitorHandler(w http.ResponseWriter, r *http.Request) {
	content, err := os.ReadFile("volume/monitor.txt")
	if err != nil {
		http.Error(w, "Error reading monitor file", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/plain")
	w.Write(content)
}

func dashboardHandler(w http.ResponseWriter, r *http.Request) {
	err := dashboardTemplate.Execute(w, nil)
	if err != nil {
		http.Error(w, "Error rendering dashboard", http.StatusInternalServerError)
		return
	}
}

func dashboardDataHandler(w http.ResponseWriter, r *http.Request) {
	datafile := "data/item_data.json"
	http.ServeFile(w, r, datafile)
}

func main() {

	fmt.Println("Starting server...")
	server := http.NewServeMux()
	server.Handle("/monitor", securityHeaders()(http.HandlerFunc(monitorHandler)))
	server.Handle("/dashboard", securityHeaders()(authMiddleware(http.HandlerFunc(dashboardHandler))))

	server.HandleFunc("/htmx/login", htmlxLoginApiHandler)

	server.HandleFunc("/api/login", loginApiHandler)
	server.HandleFunc("/api/logout", logoutApiHandler)
	server.Handle("/api/dashboard_data", securityHeaders()(authMiddleware(http.HandlerFunc(dashboardDataHandler))))
	server.Handle("/api/user", securityHeaders()(authMiddleware(http.HandlerFunc(userInfoHandler))))

	fileServerDir := "./public"
	fileServer := http.FileServer(http.Dir(fileServerDir))
	wrappedFileServer := securityHeadersWithCaching(14400)(fileServer) // 4 hours cache for static files
	server.Handle("/", wrappedFileServer)

	const addr = ":8080"
	fmt.Println("listening on", addr)
	if err := http.ListenAndServe(addr, server); err != nil {
		log.Fatalf("Server failed %v", err)
	}
}
