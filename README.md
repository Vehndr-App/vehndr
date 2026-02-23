This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Cursor Commands

- `/fresh` to pull latest from main a start a fresh new feature
- `/pr` to open a new PR in Github

# Project Overview

Vehndr is a multi-vendor marketplace application with a Next.js frontend and Rails API backend. The application supports product/service listings, shopping cart functionality, Stripe checkout, and real-time vendor order notifications via WebSockets.

## Repository Structure

```
vehndr_app/
├── vehndr/           # Next.js frontend (React 19 + Next.js 15)
└── vehndr_api/       # Rails 8 API backend (PostgreSQL)
```

## Frontend (Next.js)

### Development Commands

```bash
cd vehndr
npm run dev        # Start dev server with Turbopack (http://localhost:3000)
npm run build      # Build for production with Turbopack
npm start          # Start production server
npm run lint       # Run ESLint
```

### Architecture

**Framework:** Next.js 15 with App Router and Turbopack

**Key Directories:**
- `src/app/` - App Router pages and layouts
  - `cart/` - Shopping cart page
  - `checkout/` - Stripe checkout flow
  - `coordinators/` - Event coordinator listings
  - `dashboard/` - Vendor dashboard
  - `events/` - Event browsing
  - `login/` - Authentication
  - `store/` - Product browsing
  - `vendors/` - Vendor profiles
- `src/components/` - Reusable React components
  - `AuthGate.js` - Authentication guard wrapper
  - `Navbar.js` - Main navigation
  - `ProductCard.js` - Product display card
- `src/contexts/` - React Context providers
  - `CartContext.js` - Client-side cart state management (vendor-grouped)
- `src/hooks/` - Custom React hooks
  - `useVendorOrders.js` - ActionCable WebSocket subscription for real-time order updates
- `src/services/` - API integration
  - `api.js` - Fetch wrapper with JWT auth and error handling

**State Management:**
- React Context for cart (client-side, vendor-grouped structure)
- JWT tokens stored in localStorage (`vehndr_token`)
- Server state fetched via `api()` helper

**Authentication:**
- JWT-based via localStorage
- `AuthGate` component guards protected routes
- Token sent in `Authorization: Bearer <token>` header

**Real-time Features:**
- ActionCable WebSocket connection for vendor order notifications
- `useVendorOrders` hook handles subscription lifecycle
- WebSocket URL: `ws://localhost:3000/cable?token=<jwt>`

**Styling:** Tailwind CSS v4

## Backend (Rails API)

### Development Commands

```bash
cd vehndr_api
rails server                # Start API server (http://localhost:3000)
rails db:create             # Create database
rails db:migrate            # Run migrations
rails db:seed               # Seed with sample data
rails db:reset              # Drop, create, migrate, seed
rails console               # Rails console
rails dbconsole             # Database console
rails test                  # Run tests
rails credentials:edit      # Edit encrypted credentials
```

### Architecture

**Framework:** Rails 8.0.2 (API-only mode)

**Database:** PostgreSQL with multiple databases in production:
- Primary: `vehndr_api_production`
- Cache: `vehndr_api_production_cache` (Solid Cache)
- Queue: `vehndr_api_production_queue` (Solid Queue)
- Cable: `vehndr_api_production_cable` (Solid Cable)

**Key Directories:**
- `app/controllers/api/` - API endpoints (all namespaced under `/api`)
  - `auth_controller.rb` - JWT authentication (login, register, logout, current_user)
  - `cart_controller.rb` - Shopping cart management
  - `checkout_controller.rb` - Stripe checkout session creation
  - `vendors_controller.rb` - Vendor listings and orders
  - `products_controller.rb` - Product catalog
  - `events_controller.rb` - Event listings and recommended vendors (vector search)
  - `event_coordinators_controller.rb` - Coordinator profiles
  - `orders_controller.rb` - Order completion
- `app/models/` - ActiveRecord models
  - `User` - Authentication with bcrypt, roles: customer/vendor/coordinator
  - `Vendor` - Marketplace vendors
  - `Product` - Products/services (has `kind` field)
  - `ProductOption` - Customizable product options
  - `Cart` - Session/user-based carts
  - `CartItem` - Items in carts
  - `Order` - Completed purchases
  - `OrderItem` - Items in orders
  - `Event` - Events
  - `EventCoordinator` - Event coordinator profiles
- `app/serializers/` - ActiveModel Serializers for JSON responses (camelCase)
- `app/channels/` - ActionCable channels
  - `vendor_orders_channel.rb` - Real-time order notifications for vendors

**Authentication:**
- JWT tokens via `jwt` gem
- Tokens issued on login, verified in `BaseController#authenticate_request`
- Current user available via `current_user` helper

**Payment Processing:**
- Stripe integration for checkout
- Webhook handling for payment events
- Credentials stored in Rails encrypted credentials

**CORS:**
- Configured for `http://localhost:3000` in development
- Handles cross-origin requests from Next.js frontend

**JSON Formatting:**
- ActiveModel Serializers transform snake_case to camelCase for frontend
- Responses structured for JavaScript consumption

**Real-time:**
- ActionCable for WebSocket connections
- `VendorOrdersChannel` broadcasts new orders to authenticated vendors
- Authentication via JWT token in WebSocket URL params
## Project Overview

Vehndr is a multi-vendor marketplace application with a Next.js frontend and Rails API backend. The application supports product/service listings, shopping cart functionality, Stripe checkout, and real-time vendor order notifications via WebSockets.

## Repository Structure

```
vehndr_app/
├── vehndr/           # Next.js frontend (React 19 + Next.js 15)
└── vehndr_api/       # Rails 8 API backend (PostgreSQL)
```

## Frontend (Next.js)

### Development Commands

```bash
cd vehndr
npm run dev        # Start dev server with Turbopack (http://localhost:3000)
npm run build      # Build for production with Turbopack
npm start          # Start production server
npm run lint       # Run ESLint
```

### Architecture

**Framework:** Next.js 15 with App Router and Turbopack

**Key Directories:**
- `src/app/` - App Router pages and layouts
  - `cart/` - Shopping cart page
  - `checkout/` - Stripe checkout flow
  - `coordinators/` - Event coordinator listings
  - `dashboard/` - Vendor dashboard
  - `events/` - Event browsing
  - `login/` - Authentication
  - `store/` - Product browsing
  - `vendors/` - Vendor profiles
- `src/components/` - Reusable React components
  - `AuthGate.js` - Authentication guard wrapper
  - `Navbar.js` - Main navigation
  - `ProductCard.js` - Product display card
- `src/contexts/` - React Context providers
  - `CartContext.js` - Client-side cart state management (vendor-grouped)
- `src/hooks/` - Custom React hooks
  - `useVendorOrders.js` - ActionCable WebSocket subscription for real-time order updates
- `src/services/` - API integration
  - `api.js` - Fetch wrapper with JWT auth and error handling

**State Management:**
- React Context for cart (client-side, vendor-grouped structure)
- JWT tokens stored in localStorage (`vehndr_token`)
- Server state fetched via `api()` helper

**Authentication:**
- JWT-based via localStorage
- `AuthGate` component guards protected routes
- Token sent in `Authorization: Bearer <token>` header

**Real-time Features:**
- ActionCable WebSocket connection for vendor order notifications
- `useVendorOrders` hook handles subscription lifecycle
- WebSocket URL: `ws://localhost:3000/cable?token=<jwt>`

**Styling:** Tailwind CSS v4

## Backend (Rails API)

### Development Commands

```bash
cd vehndr_api
rails server                # Start API server (http://localhost:3000)
rails db:create             # Create database
rails db:migrate            # Run migrations
rails db:seed               # Seed with sample data
rails db:reset              # Drop, create, migrate, seed
rails console               # Rails console
rails dbconsole             # Database console
rails test                  # Run tests
rails credentials:edit      # Edit encrypted credentials
```

### Architecture

**Framework:** Rails 8.0.2 (API-only mode)

**Database:** PostgreSQL with multiple databases in production:
- Primary: `vehndr_api_production`
- Cache: `vehndr_api_production_cache` (Solid Cache)
- Queue: `vehndr_api_production_queue` (Solid Queue)
- Cable: `vehndr_api_production_cable` (Solid Cable)

**Key Directories:**
- `app/controllers/api/` - API endpoints (all namespaced under `/api`)
  - `auth_controller.rb` - JWT authentication (login, register, logout, current_user)
  - `cart_controller.rb` - Shopping cart management
  - `checkout_controller.rb` - Stripe checkout session creation
  - `vendors_controller.rb` - Vendor listings and orders
  - `products_controller.rb` - Product catalog
  - `events_controller.rb` - Event listings and recommended vendors (vector search)
  - `event_coordinators_controller.rb` - Coordinator profiles
  - `orders_controller.rb` - Order completion
- `app/models/` - ActiveRecord models
  - `User` - Authentication with bcrypt, roles: customer/vendor/coordinator
  - `Vendor` - Marketplace vendors
  - `Product` - Products/services (has `kind` field)
  - `ProductOption` - Customizable product options
  - `Cart` - Session/user-based carts
  - `CartItem` - Items in carts
  - `Order` - Completed purchases
  - `OrderItem` - Items in orders
  - `Event` - Events
  - `EventCoordinator` - Event coordinator profiles
- `app/serializers/` - ActiveModel Serializers for JSON responses (camelCase)
- `app/channels/` - ActionCable channels
  - `vendor_orders_channel.rb` - Real-time order notifications for vendors

**Authentication:**
- JWT tokens via `jwt` gem
- Tokens issued on login, verified in `BaseController#authenticate_request`
- Current user available via `current_user` helper

**Payment Processing:**
- Stripe integration for checkout
- Webhook handling for payment events
- Credentials stored in Rails encrypted credentials

**CORS:**
- Configured for `http://localhost:3000` in development
- Handles cross-origin requests from Next.js frontend

**JSON Formatting:**
- ActiveModel Serializers transform snake_case to camelCase for frontend
- Responses structured for JavaScript consumption

**Real-time:**
- ActionCable for WebSocket connections
- `VendorOrdersChannel` broadcasts new orders to authenticated vendors
**Vector Search & Nearest Neighbors:**
- PostgreSQL `pgvector` extension for vector storage and similarity search
- `neighbor` gem for nearest neighbor queries
- `langchainrb_rails` gem for vectorsearch integration with OpenAI embeddings
- Models with vectorsearch enabled:
  - `Vendor` - includes `vectorsearch` concern and `after_save :upsert_to_vectorsearch`
  - `Event` - includes `vectorsearch` concern and `after_save :upsert_to_vectorsearch`
  - `Product` - includes `vectorsearch` concern and `after_save :upsert_to_vectorsearch`
- Embeddings generated via OpenAI's `gpt-5-nano-2025-08-07` model
- Usage example (see `events_controller.rb:140`):
  ```ruby
  # Find 3 vendors most similar to an event using Euclidean distance
  vendors = Vendor.nearest_neighbors(:embedding, event.embedding, distance: 'euclidean').first(3)
  ```
- Configuration in `config/initializers/langchainrb_rails.rb`
- Requires `OPENAI_API_KEY` environment variable

## API Integration

**Base URL:** `http://localhost:3000` (configurable via `NEXT_PUBLIC_API_URL`)

**Request Flow:**
1. Frontend calls `api(path, options)` from `src/services/api.js`
2. JWT token auto-attached from localStorage
3. Rails API processes request, validates JWT
4. Response serialized to camelCase JSON
5. Frontend receives and processes data

**Error Handling:**
- API helper throws errors with status and details
- Controllers return appropriate HTTP status codes
- Validation errors include field-specific messages

## Environment Variables

**Frontend (Next.js):**
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:3000)

**Backend (Rails):**
- `DATABASE_URL` - PostgreSQL connection string
- `STRIPE_SECRET_KEY` - Stripe API key (in credentials)
- `VEHNDR_STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret (in credentials or ENV)
- `SECRET_KEY_BASE` - Rails secret key base
- `VEHNDR_API_DATABASE_PASSWORD` - Production database password
- `OPENAI_API_KEY` - OpenAI API key for vector embeddings generation

## Data Flow Patterns

**Shopping Cart:**
- Client-side Context (CartContext) for immediate UI updates
- Server-side Cart model for persistence and checkout
- Vendor-grouped structure: `{vendorId: [items]}`

**Authentication:**
- Login → JWT token → localStorage → Authorization header → verified on each request

**Real-time Orders:**
- Order created → Checkout controller broadcasts → ActionCable → VendorOrdersChannel → Frontend hook → UI update

**Vector Search Recommendations:**
- Model saved → `after_save` hook triggers → `upsert_to_vectorsearch` → OpenAI generates embedding → Stored in PostgreSQL pgvector
- Recommendation request → `nearest_neighbors(:embedding, target_embedding, distance: 'euclidean')` → Returns most similar records

## Testing

**Frontend:**
- ESLint configured with Next.js rules

**Backend:**
- Rails test suite in `test/` directory
- Test accounts created by seeds (see README for credentials)

## Deployment

**Backend:**
- Docker support via Kamal (`kamal deploy`)
- Dockerfile included
- Multi-database production setup
