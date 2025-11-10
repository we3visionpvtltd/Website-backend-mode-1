# We3Vision Backend API

A Node.js/Express backend API for the We3Vision blog system with user authentication and CRUD operations.

## Features

- **User Authentication**: JWT-based authentication with role-based access control
- **Blog Management**: Full CRUD operations for blog posts
- **File Upload**: Image upload support for blog featured images
- **User Management**: Admin panel for user management
- **Security**: Rate limiting, input validation, and security headers

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **Express Validator** - Input validation

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Configuration**
   - Copy `config.env` and update the values:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/we3vision_blog
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRE=30d
   NODE_ENV=development
   ```

3. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password

### Blog Management

#### Public Endpoints
- `GET /api/blog` - Get all published blogs
- `GET /api/blog/featured` - Get featured blogs
- `GET /api/blog/:slug` - Get single blog by slug

#### Admin Endpoints (Require Admin Role)
- `POST /api/blog` - Create new blog
- `PUT /api/blog/:id` - Update blog
- `DELETE /api/blog/:id` - Delete blog
- `GET /api/blog/admin/all` - Get all blogs (including drafts)

#### User Endpoints (Require Authentication)
- `POST /api/blog/:id/like` - Toggle like on blog
- `POST /api/blog/:id/comment` - Add comment to blog

### User Management (Admin Only)

- `GET /api/user` - Get all users
- `GET /api/user/:id` - Get single user
- `PUT /api/user/:id/role` - Update user role
- `PUT /api/user/:id/status` - Toggle user status
- `DELETE /api/user/:id` - Delete user
- `GET /api/user/stats/overview` - Get user statistics

## Database Models

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (enum: ['user', 'admin']),
  avatar: String,
  bio: String,
  isActive: Boolean,
  lastLogin: Date
}
```

### Blog Model
```javascript
{
  title: String,
  slug: String (unique),
  content: String,
  excerpt: String,
  featuredImage: String,
  author: ObjectId (ref: User),
  category: String,
  tags: [String],
  status: String (enum: ['draft', 'published', 'archived']),
  isFeatured: Boolean,
  readTime: Number,
  views: Number,
  likes: [ObjectId],
  comments: [{
    user: ObjectId,
    comment: String,
    createdAt: Date
  }],
  seoTitle: String,
  seoDescription: String,
  seoKeywords: [String]
}
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for password security
- **Input Validation**: Express-validator for request validation
- **Rate Limiting**: Prevents abuse with request limits
- **CORS**: Configured for frontend integration
- **Helmet**: Security headers middleware

## File Upload

- **Supported Formats**: Images (jpg, jpeg, png, gif, webp)
- **File Size Limit**: 5MB per file
- **Storage**: Local file system in `uploads/` directory
- **URL Format**: `/uploads/filename.ext`

## Error Handling

The API returns consistent error responses:

```javascript
{
  "status": "error",
  "message": "Error description",
  "errors": [] // Validation errors if any
}
```

## Success Responses

```javascript
{
  "status": "success",
  "data": {}, // Response data
  "pagination": {} // For paginated responses
}
```

## Development

### Creating Admin User

To create the first admin user, you can either:

1. **Use the registration endpoint** and manually update the role in the database
2. **Create a seed script** to initialize admin users

### Testing

The API can be tested using tools like:
- Postman
- Insomnia
- curl commands

### Environment Variables

- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRE`: JWT token expiration time
- `NODE_ENV`: Environment (development/production)

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure MongoDB Atlas or production database
4. Set up proper CORS origins
5. Use environment variables for sensitive data
6. Set up proper logging and monitoring

## License

This project is part of the We3Vision Private Limited website. 