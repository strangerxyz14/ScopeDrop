#!/bin/bash

# Supabase Setup Script for ScopeDrop Optimized Content System
# This script sets up the complete Supabase infrastructure

set -e

echo "🚀 Setting up Supabase for ScopeDrop Optimized Content System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Supabase CLI is installed
check_supabase_cli() {
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI is not installed. Please install it first:"
        echo "npm install -g supabase"
        exit 1
    fi
    print_success "Supabase CLI is installed"
}

# Initialize Supabase project
init_supabase() {
    print_status "Initializing Supabase project..."
    
    if [ ! -f "supabase/config.toml" ]; then
        supabase init
        print_success "Supabase project initialized"
    else
        print_warning "Supabase project already initialized"
    fi
}

# Start local Supabase
start_local_supabase() {
    print_status "Starting local Supabase..."
    supabase start
    print_success "Local Supabase started"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Run initial schema migration
    supabase db reset
    print_success "Database migrations completed"
}

# Deploy Edge Functions
deploy_edge_functions() {
    print_status "Deploying Edge Functions..."
    
    # Deploy content orchestrator
    supabase functions deploy content-orchestrator-v2
    print_success "Edge Functions deployed"
}

# Set up environment variables
setup_env() {
    print_status "Setting up environment variables..."
    
    if [ ! -f ".env" ]; then
        cp .env.example .env
        print_warning "Please update .env file with your actual API keys and Supabase credentials"
    else
        print_warning ".env file already exists. Please verify your configuration"
    fi
}

# Test the setup
test_setup() {
    print_status "Testing the setup..."
    
    # Test database connection
    if supabase db ping &> /dev/null; then
        print_success "Database connection successful"
    else
        print_error "Database connection failed"
        exit 1
    fi
    
    # Test Edge Functions
    if curl -s "http://localhost:54321/functions/v1/content-orchestrator-v2" &> /dev/null; then
        print_success "Edge Functions accessible"
    else
        print_warning "Edge Functions not accessible (this is normal if not deployed yet)"
    fi
}

# Create initial data
create_initial_data() {
    print_status "Creating initial data..."
    
    # Insert sample content jobs
    supabase db reset --linked
    print_success "Initial data created"
}

# Main setup function
main() {
    echo "=========================================="
    echo "ScopeDrop Supabase Setup"
    echo "=========================================="
    
    check_supabase_cli
    init_supabase
    setup_env
    
    echo ""
    echo "=========================================="
    echo "Next Steps:"
    echo "=========================================="
    echo "1. Update .env file with your API keys:"
    echo "   - VITE_GNEWS_API_KEY"
    echo "   - VITE_GEMINI_API_KEY"
    echo "   - VITE_SUPABASE_URL"
    echo "   - VITE_SUPABASE_ANON_KEY"
    echo ""
    echo "2. Start local development:"
    echo "   supabase start"
    echo ""
    echo "3. Run migrations:"
    echo "   supabase db reset"
    echo ""
    echo "4. Deploy Edge Functions:"
    echo "   supabase functions deploy content-orchestrator-v2"
    echo ""
    echo "5. Test the setup:"
    echo "   npm run dev"
    echo ""
    echo "=========================================="
    print_success "Setup script completed!"
}

# Run main function
main "$@"