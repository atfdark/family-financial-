# Vercel Deployment Guide

This guide will help you deploy the Family Financial Management application to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install with `npm install -g vercel`
3. **Supabase Project**: Set up a Supabase project and get your connection details

## Environment Variables Setup

Before deploying, you need to set up the following environment variables in your Vercel project:

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add the following variables:

### Required Variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `JWT_SECRET`: A strong secret key for JWT tokens (generate with `openssl rand -base64 32`)

### Optional Variables:
- `CORS_ORIGINS_STR`: Comma-separated list of allowed origins (default: "*")
- `DEBUG`: Set to "true" for debug mode (default: "false")

## Database Setup

1. **Supabase Setup**: 
   - Create a new Supabase project
   - Run the SQL schema from `supabase_schema.sql` in your Supabase SQL editor
   - Get your connection details from the Supabase dashboard

2. **Environment Variables**:
   - Copy the `.env.example` file to `.env` locally
   - Fill in your Supabase credentials
   - These same values should be added to Vercel environment variables

## Deployment Steps

### Method 1: Deploy from GitHub (Recommended)

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and connect your GitHub account
3. Import your repository
4. Configure the project settings:
   - Framework Preset: `Other`
   - Build Command: `echo "No build step needed"`
   - Output Directory: `public` (optional, for static files)
5. Add environment variables in the Vercel dashboard
6. Click "Deploy"

### Method 2: Deploy with Vercel CLI

1. Install Vercel CLI: `npm install -g vercel`
2. Login: `vercel login`
3. Navigate to your project directory: `cd family-financial-`
4. Deploy: `vercel`
5. Follow the prompts to configure your project
6. Add environment variables when prompted or via `vercel env add`

## Post-Deployment

1. **Verify Deployment**: Visit your deployed URL
2. **Test API Endpoints**: Use tools like Postman or curl to test:
   - `GET /api/auth/health`
   - `POST /api/auth/register`
   - `POST /api/auth/login`

3. **Database Verification**: Ensure your Supabase database is properly connected

## Troubleshooting

### Common Issues:

1. **Function Runtime Error**: 
   - Ensure `vercel.json` specifies `"runtime": "python3.10"`
   - Check that `requirements.txt` is in the root directory

2. **Environment Variables Not Found**:
   - Verify all required environment variables are set in Vercel dashboard
   - Check that variable names match exactly (case-sensitive)

3. **Database Connection Issues**:
   - Verify Supabase credentials are correct
   - Check that your Supabase project allows connections from Vercel IPs
   - Ensure the database schema is properly set up

4. **CORS Issues**:
   - Set `CORS_ORIGINS_STR` to include your frontend domain
   - For development: `http://localhost:3000,http://127.0.0.1:3000`
   - For production: your actual domain

### Debug Mode

To enable debug mode for troubleshooting:
1. Set `DEBUG=true` in your Vercel environment variables
2. Check Vercel logs: `vercel logs your-project-name.vercel.app`

## File Structure for Vercel

```
family-financial-/
├── api/
│   └── index.py          # Vercel function entry point
├── fastapi_backend/      # Main application code
├── public/               # Static files (HTML, CSS, JS)
├── requirements.txt      # Python dependencies
├── vercel.json          # Vercel configuration
├── .env.example         # Environment variables template
└── README.md
```

## Performance Optimization

1. **Database Connection Pooling**: Consider using connection pooling for better performance
2. **Caching**: Implement caching for frequently accessed data
3. **Static Assets**: Serve static files through Vercel's CDN

## Security Notes

1. **JWT Secret**: Use a strong, unique JWT secret
2. **Environment Variables**: Never commit `.env` files to version control
3. **Supabase Keys**: Restrict Supabase API keys to specific domains when possible
4. **HTTPS**: Vercel automatically provides HTTPS for all deployments

## Support

For additional help:
- [Vercel Documentation](https://vercel.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Supabase Documentation](https://supabase.com/docs)