Cashback & Coupon Platform - Backend
This is the complete backend for a production-ready Cashback & Coupon platform, built with Node.js, Express, and MongoDB. It provides a robust, secure, and scalable foundation for a website similar to CashKaro.

✨ Features
User Authentication: Secure JWT-based authentication with registration, login, logout, and password management (forgot/reset).

Email Verification: Automated email verification for new users.

Cashback & Transaction System:

End-to-end tracking of user clicks on affiliate links.

Automated transaction creation and status updates via affiliate network webhooks.

Calculation of user cashback balances (pending, available).

Withdrawal System:

Users can request withdrawals of their available cashback.

Razorpay Payouts Integration for processing withdrawals.

Automated status updates via Razorpay webhooks.

Admin Panel:

Full CRUD (Create, Read, Update, Delete) management for Retailers and Offers.

User management (view list, activate/deactivate accounts).

Withdrawal request management (view requests, approve/process payouts).

Security: Rate limiting, data sanitization (against NoSQL injection and XSS), CORS, and parameter pollution protection.

API Documentation: Auto-generated Swagger/OpenAPI documentation for easy testing and integration.

Robust Error Handling: Centralized error handling for consistent and predictable error responses.

Structured Logging: Detailed logging with Winston for easy debugging and monitoring.

🛠️ Tech Stack
Backend: Node.js, Express.js

Database: MongoDB with Mongoose ODM

Authentication: JSON Web Tokens (JWT)

Payments/Payouts: Razorpay API

Validation: Joi

Email: Nodemailer

API Documentation: Swagger (OpenAPI)

Security: Helmet, Express Rate Limit, express-mongo-sanitize, hpp

📋 Prerequisites
Node.js (v18.x or higher)

npm or yarn

MongoDB (local instance or a cloud service like MongoDB Atlas)

A Razorpay account for payout credentials.

🚀 Getting Started
1. Clone the repository
git clone <your-repository-url>
cd cashback-platform-backend

2. Install dependencies
npm install

3. Set up environment variables
Create a .env file in the root of the project by copying the example file:

cp .env.example .env

Now, open the .env file and fill in the required values:

# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/cashback_platform

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=7

# Email Configuration (e.g., using Mailtrap for development)
EMAIL_FROM=noreply@cashbackplatform.com
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USERNAME=your_mailtrap_username
EMAIL_PASSWORD=your_mailtrap_password

# Razorpay Payouts Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_ACCOUNT_NUMBER=your_razorpay_account_number
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# Secret key for securing affiliate callbacks
CALLBACK_API_KEY=a_very_secret_key_for_callbacks

4. Running the Application
Development Mode (with hot-reloading using nodemon):

npm run dev

Production Mode:

npm start

The server will start on the port specified in your .env file (e.g., http://localhost:5000).

📚 API Documentation
Once the server is running, you can access the interactive Swagger API documentation in your browser. This is the best place to view all available endpoints, their parameters, and test them directly.

URL: http://localhost:5000/api-docs

📁 Project Structure
/src
├── config/         # Database, Razorpay, Swagger configurations
├── controllers/    # Business logic for API routes
├── middleware/     # Express middleware (auth, validation, errors)
├── models/         # Mongoose database schemas
├── routes/         # API route definitions
└── utils/          # Helper functions and classes (email, logger, etc.)
