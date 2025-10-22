# Quick Start Guide - PolyGuild

## 🚀 Get Up and Running in 5 Minutes

### 1. Install Dependencies
```bash
cd /Users/eliasstevenson/Desktop/PolyNews/polyguild
npm install
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Set Up Environment Variables (Optional for MVP)

The app will work without a database for browsing markets, but you'll need a database for arbitrage features.

**For testing without database:**
```bash
# Create .env file
touch .env

# The app will handle missing database gracefully
```

**For full functionality with database:**
```bash
# Copy example
cp .env.example .env

# Edit .env and add your PostgreSQL URL
DATABASE_URL="postgresql://user:password@localhost:5432/polyguild"
```

If you have PostgreSQL locally:
```bash
# Create database
createdb polyguild

# Run migrations
npx prisma migrate dev
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## 📱 Test the Features

### Test Markets Page
1. Navigate to **Markets** in the navigation
2. You should see markets from Polymarket (and Kalshi if their API is accessible)
3. Try filtering by platform: All, Polymarket, Kalshi
4. Click on market cards to see details
5. Click "Trade on..." buttons to visit the actual platforms

### Test Arbitrage Page
1. Navigate to **Arbitrage** in the navigation
2. Click the "**Scan Now**" button to trigger manual arbitrage detection
3. Wait for the scan to complete (5-10 seconds)
4. You should see:
   - Statistics cards at the top (Total Opportunities, Largest Gap, etc.)
   - Grid of arbitrage opportunity cards
   - Each card shows side-by-side price comparison
   - Links to both platforms
4. Try filters: All, >2%, >5%, >10%

### Test Homepage
1. Go back to homepage (click "PolyGuild" logo)
2. See the hero section with live stats
3. View top 3 arbitrage opportunities
4. Explore the features section

## 🔧 Troubleshooting

### Issue: "Cannot connect to database"
**Solution**: The app works without database for market browsing. For arbitrage features, you need PostgreSQL.

### Issue: "No markets showing"
**Solution**: This means the Polymarket or Kalshi APIs are down or rate-limiting. Try again in a few minutes.

### Issue: "No arbitrage opportunities found"
**Solution**: Click "Scan Now" to trigger a fresh scan. If still empty:
- Lower the minimum gap filter to "All"
- Try again - arbitrage opportunities are rare and fleeting
- Check if markets are loading on the Markets page

### Issue: Build fails
**Solution**: 
```bash
# Clean and reinstall
rm -rf node_modules .next
npm install
npx prisma generate
npm run build
```

## 📊 Understanding the Data

### Market Prices
- Prices are normalized to 0-100 scale (e.g., 65¢ = 65% probability)
- YES price + NO price should roughly equal 100
- Higher prices = higher probability according to the market

### Arbitrage Opportunities
- **Price Difference**: Absolute difference between platforms (e.g., 5¢)
- **Percentage Gap**: Relative difference as a percentage
- **Potential Profit**: Estimated profit on a $100 investment (before fees)
- **Note**: This is simplified - real arbitrage requires account with both platforms and considers fees/slippage

### Example Arbitrage
```
Market: "Will X happen by Dec 2024?"

Polymarket YES: 60¢
Kalshi YES: 55¢

Gap: 5¢ (8.3%)
Strategy: Buy YES on Kalshi @ 55¢, Sell YES on Polymarket @ 60¢
Potential Profit: $5 per $100 invested (simplified)
```

## 🎯 Production Deployment

### Deploy to Vercel

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

2. **Import to Vercel**
- Go to [vercel.com](https://vercel.com)
- Click "New Project"
- Import your GitHub repository
- Vercel will auto-detect Next.js

3. **Add Environment Variables**
In Vercel dashboard:
- Go to Settings → Environment Variables
- Add `DATABASE_URL` (use Vercel Postgres or your own PostgreSQL)
- Add `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
- Add `NEXTAUTH_URL` (your Vercel deployment URL)

4. **Setup Vercel Postgres (Optional)**
- In Vercel dashboard, go to Storage
- Create new Postgres database
- Copy connection string to `DATABASE_URL`

5. **Deploy!**
- Click "Deploy"
- Vercel will run migrations automatically
- Cron jobs will be set up automatically from `vercel.json`

## 📈 Monitoring

After deployment, monitor:
- **Build Logs**: Check for any errors
- **Function Logs**: Monitor API routes performance
- **Cron Jobs**: Verify arbitrage scan runs every 5 minutes
- **Database**: Check Prisma migrations applied

## 🛠️ Development Tips

### Hot Reload
- Changes to pages/components auto-reload
- Changes to API routes require manual refresh
- Database schema changes require `npx prisma migrate dev`

### Debugging API Routes
```bash
# Check API routes directly
curl http://localhost:3000/api/markets
curl http://localhost:3000/api/arbitrage
```

### Database Management
```bash
# View database in Prisma Studio
npx prisma studio

# Reset database
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name your_change
```

## ⚡ Performance Tips

- **Caching**: Markets are cached for 5 minutes
- **Limit**: Default limit is 50-100 markets per platform
- **Parallelization**: API calls to both platforms run in parallel
- **Database Queries**: Use indexes on frequently queried fields

## 🎨 Customization

### Change Colors
Edit `src/app/globals.css` - CSS variables for light/dark mode

### Add More Platforms
1. Create new client in `src/lib/[platform]/client.ts`
2. Add transformer in `src/lib/unified/transformer.ts`
3. Update API routes to include new platform
4. Add platform badge color in components

### Modify Arbitrage Threshold
Edit `src/lib/arbitrage/scanner.ts`:
```typescript
private minGapThreshold: number = 2; // Change this value
```

## 🎉 You're All Set!

Your PolyGuild platform is now running. Start exploring arbitrage opportunities!

### Next Steps
- Star the GitHub repo
- Share with friends
- Contribute improvements
- Deploy to production

---

**Questions?** Check `README.md` for detailed documentation.
**Issues?** The app has extensive error handling and will show helpful messages.

